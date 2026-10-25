import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Matrix4,
  type InstancedMesh,
} from "three"
import { useEditorStore } from "../store"
import { SEG, edgeStep, enclosedRegions, isDiagonalEdge } from "../layout"
import type { DayProfile } from "../daylight"

/** Just above the blobs under furniture. */
const Y = 0.018
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
    const edge = (t: number) => Math.min(1, Math.max(0, (1 - Math.abs(t * 2 - 1)) / 0.3))
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const a = edge((x + 0.5) / size) * edge((y + 0.5) / size)
        // An alpha map is read from the green channel: grey levels, not alpha.
        const level = Math.round(a * a * (3 - 2 * a) * 255)
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
  const objects = useEditorStore((s) => s.objects)
  const invalidate = useThree((s) => s.invalidate)
  const ref = useRef<InstancedMesh>(null)
  const texture = useMemo(createPoolTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  // Each window, and which way is in (towards the room it lights).
  const windows = useMemo(() => {
    const inside = new Set<string>()
    for (const region of enclosedRegions(objects))
      for (const c of region) inside.add(`${c.x},${c.z}`)
    const isInside = (x: number, z: number) =>
      inside.has(`${Math.floor(x / SEG) * SEG},${Math.floor(z / SEG) * SEG}`)
    return objects
      .filter((o) => o.type === "window")
      .flatMap((o) => {
        // Along the wall (any direction, diagonals too), and across it.
        const [sx, sz] = edgeStep(o.rotation)
        const unit = Math.hypot(sx, sz)
        const along = [sx / unit, sz / unit] as const
        const [nx, nz] = [-along[1], along[0]]
        // Sample a little either side: far enough to leave the squares a
        // diagonal wall runs through.
        const step = isDiagonalEdge(o.rotation) ? SEG * 1.6 : SEG / 2
        const sign = isInside(o.x + nx * step, o.z + nz * step)
          ? 1
          : isInside(o.x - nx * step, o.z - nz * step)
            ? -1
            : 0
        if (!sign) return [] // between two outsides (or two rooms' worth of glass): skip
        // Its glass is as much wider as a diagonal window is longer.
        const width = WIDTH * (isDiagonalEdge(o.rotation) ? Math.SQRT2 : 1)
        return [{ x: o.x, z: o.z, along, width, inward: [nx * sign, nz * sign] as const }]
      })
  }, [objects])

  const [sx, sy, sz] = profile.sunPosition
  const sunUp = Math.min(1, profile.sunIntensity / FULL_SUN) * (1 - profile.nightness)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const flat = Math.hypot(sx, sz)
    let count = 0
    if (sunUp > 0.02 && flat > 1e-3 && sy > 0) {
      // Where the light goes (along the floor), and how far it travels per metre it drops.
      const [dx, dz] = [-sx / flat, -sz / flat]
      const reachPerMetre = flat / sy
      for (const w of windows) {
        const facing = dx * w.inward[0] + dz * w.inward[1]
        if (facing < 0.1) continue // the sun's on this window's inside: no light through it
        const near = SILL * reachPerMetre
        const length = Math.min(MAX_LENGTH, (HEAD - SILL) * reachPerMetre)
        const mid = near + length / 2
        const [ax, az] = [w.along[0] * w.width, w.along[1] * w.width]
        // Columns: across the window, along the light, up; then where.
        // prettier-ignore
        matrix.set(
          ax, dx * length, 0, w.x + dx * mid,
          0, 0, 1, Y,
          az, dz * length, 0, w.z + dz * mid,
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
  }, [windows, sx, sy, sz, sunUp, profile.sunColor, invalidate])

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
