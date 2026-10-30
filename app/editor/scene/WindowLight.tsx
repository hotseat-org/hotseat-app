import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Matrix4,
  MathUtils,
  type InstancedMesh,
} from "three"
import { useEditorStore } from "../store"
import { SEG, edgeStep, enclosedRegions, getCellKey, getCellKeyAt, isDiagonalEdge } from "../layout"
import type { DayProfile } from "../daylight"

/** Just above the blobs under furniture. */
const HEIGHT = 0.018
/** The window's glass, in wall heights (see objects/Window.tsx). */
const SILL = 0.55
const HEAD = 1.2
/** Glass width, a little inside the 1 m frame. */
const WIDTH = 0.85
/** How bright a pool gets with the sun straight through the window. */
const STRENGTH = 0.75
/** Longest pool (m): a low sun throws them far, and thin. */
const MAX_LENGTH = 4.5
/** The sun's full strength (see daylight.ts). */
const FULL_SUN = 2.6

const matrix = new Matrix4()
const color = new Color()

/** A soft-edged rectangle: flat in the middle, fading at the edges. */
const createPoolTexture = () => {
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const context = canvas.getContext("2d")
  if (context) {
    const image = context.createImageData(size, size)
    const edge = (fraction: number) => MathUtils.clamp((1 - Math.abs(fraction * 2 - 1)) / 0.3, 0, 1)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const alpha = edge((x + 0.5) / size) * edge((y + 0.5) / size)
        // An alpha map is read from the green channel: grey levels, not alpha.
        const level = Math.round(alpha * alpha * (3 - 2 * alpha) * 255)
        image.data.set([level, level, level, 255], (y * size + x) * 4)
      }
    context.putImageData(image, 0, 0)
  }

  return new CanvasTexture(canvas)
}

interface Props {
  profile: DayProfile
}

/**
 * Sunlight through the windows: a warm, soft patch on the floor inside each
 * window the sun shines into, thrown away from the sun — long and faint when
 * it's low, short and bright at midday, gone at night. Worked out from the
 * sun's direction whenever it changes; one instanced draw call, added on top.
 */
export const WindowLight = ({ profile }: Props) => {
  const objects = useEditorStore((state) => state.objects)
  const invalidate = useThree((state) => state.invalidate)
  const ref = useRef<InstancedMesh>(null)
  const texture = useMemo(createPoolTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  // Each window, and which way is in (towards the room it lights).
  const windows = useMemo(() => {
    const inside = new Set<string>()
    for (const region of enclosedRegions(objects))
      for (const cell of region) inside.add(getCellKey(cell.x, cell.z))
    const isInside = (x: number, z: number) => inside.has(getCellKeyAt(x, z))

    return objects
      .filter((object) => object.type === "window")
      .flatMap((object) => {
        // Along the wall (any direction, diagonals too), and across it.
        const [stepX, stepZ] = edgeStep(object.rotation)
        const unit = Math.hypot(stepX, stepZ)
        const along = [stepX / unit, stepZ / unit] as const
        const [normalX, normalZ] = [-along[1], along[0]]
        // Sample a little either side: far enough to leave the squares a
        // diagonal wall runs through.
        const step = isDiagonalEdge(object.rotation) ? SEG * 1.6 : SEG / 2
        const getInwardSign = () => {
          if (isInside(object.x + normalX * step, object.z + normalZ * step)) return 1
          if (isInside(object.x - normalX * step, object.z - normalZ * step)) return -1

          return 0
        }
        const sign = getInwardSign()
        if (!sign) return [] // between two outsides (or two rooms' worth of glass): skip

        // Its glass is as much wider as a diagonal window is longer.
        const width = WIDTH * (isDiagonalEdge(object.rotation) ? Math.SQRT2 : 1)

        return [
          {
            x: object.x,
            z: object.z,
            along,
            width,
            inward: [normalX * sign, normalZ * sign] as const,
          },
        ]
      })
  }, [objects])

  const [sunX, sunY, sunZ] = profile.sunPosition
  const sunUp = Math.min(1, profile.sunIntensity / FULL_SUN) * (1 - profile.nightness)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return

    const flat = Math.hypot(sunX, sunZ)
    let count = 0
    if (sunUp > 0.02 && flat > 1e-3 && sunY > 0) {
      // Where the light goes (along the floor), and how far it travels per metre it drops.
      const [lightX, lightZ] = [-sunX / flat, -sunZ / flat]
      const reachPerMetre = flat / sunY
      for (const opening of windows) {
        const facing = lightX * opening.inward[0] + lightZ * opening.inward[1]
        if (facing < 0.1) continue // the sun's on this window's inside: no light through it

        const near = SILL * reachPerMetre
        const length = Math.min(MAX_LENGTH, (HEAD - SILL) * reachPerMetre)
        const mid = near + length / 2
        const [spanX, spanZ] = [opening.along[0] * opening.width, opening.along[1] * opening.width]
        // Columns: across the window, along the light, up; then where.
        // prettier-ignore
        matrix.set(
          spanX, lightX * length, 0, opening.x + lightX * mid,
          0, 0, 1, HEIGHT,
          spanZ, lightZ * length, 0, opening.z + lightZ * mid,
          0, 0, 0, 1
        )
        mesh.setMatrixAt(count, matrix)
        // Spread over a longer pool, the same light is fainter.
        const brightness = STRENGTH * sunUp * facing * Math.min(1, 1.2 / length)
        mesh.setColorAt(count, color.set(profile.sunColor).multiplyScalar(brightness))
        count++
      }
    }

    mesh.count = count
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    mesh.computeBoundingSphere()
    invalidate()
  }, [windows, sunX, sunY, sunZ, sunUp, profile.sunColor, invalidate])

  if (windows.length === 0) return null

  return (
    <instancedMesh
      key={windows.length}
      ref={ref}
      args={[undefined, undefined, windows.length]}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        alphaMap={texture}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </instancedMesh>
  )
}
