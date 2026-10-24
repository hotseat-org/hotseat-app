import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { CanvasTexture, Object3D, type InstancedMesh } from "three"
import { useEditorStore } from "../store"
import { footprintCells } from "../layout"
import { GRID, isEdgeType, isMarker, isWallMounted, type ObjectType } from "../types"

/** Just above rugs (their top is 0.014), so a piece on a rug shades it too. */
const Y = 0.016
/** How dark the middle of a blob gets. */
const STRENGTH = 0.34
/** Blobs reach a little past the piece's footprint. */
const SPREAD = 1.12
/** Not grounded: flat on the floor already, or hanging from above. */
const UNGROUNDED = new Set<ObjectType>(["rug", "ceilingLight"])

const dummy = new Object3D()

/** A soft, rounded-square shadow: dark in the middle, fading out to the edges. */
const createBlobTexture = () => {
  const size = 64
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const context = canvas.getContext("2d")
  if (context) {
    const image = context.createImageData(size, size)
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        // Distance from the middle in a rounded square (a superellipse), 0…1.
        const u = Math.abs((x + 0.5) / size - 0.5) * 2
        const v = Math.abs((y + 0.5) / size - 0.5) * 2
        const d = Math.pow(u ** 4 + v ** 4, 0.25)
        const t = Math.min(1, Math.max(0, (d - 0.35) / 0.65))
        const a = 1 - t * t * (3 - 2 * t)
        // An alpha map is read from the green channel: grey levels, not alpha.
        const level = Math.round(a * 255)
        image.data.set([level, level, level, 255], (y * size + x) * 4)
      }
    context.putImageData(image, 0, 0)
  }
  return new CanvasTexture(canvas)
}

/**
 * A soft shadow under every piece standing on the floor: grounds furniture
 * wherever the sun's shadow is thin or falls the other way. One instanced
 * mesh for the whole office — a single draw call.
 */
export const ContactBlobs = () => {
  const objects = useEditorStore((s) => s.objects)
  const invalidate = useThree((s) => s.invalidate)
  const ref = useRef<InstancedMesh>(null)
  const texture = useMemo(createBlobTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  const pieces = useMemo(
    () =>
      objects.filter(
        (o) =>
          !isEdgeType(o.type) &&
          !isMarker(o.type) &&
          !isWallMounted(o.type) &&
          !UNGROUNDED.has(o.type)
      ),
    [objects]
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    pieces.forEach((o, i) => {
      const [cx, cz] = footprintCells(o.type, o.rotation)
      dummy.position.set(o.x, Y, o.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.set(cx * GRID * SPREAD, cz * GRID * SPREAD, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = pieces.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [pieces, invalidate])

  if (pieces.length === 0) return null
  return (
    // Keyed by count so the instance buffer is re-sized as pieces come and go.
    <instancedMesh
      key={pieces.length}
      ref={ref}
      args={[undefined, undefined, pieces.length]}
      raycast={() => null}
      renderOrder={-1}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color="#1a1410"
        alphaMap={texture}
        transparent
        opacity={STRENGTH}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </instancedMesh>
  )
}
