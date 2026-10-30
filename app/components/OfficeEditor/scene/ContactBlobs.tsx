import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { CanvasTexture, Object3D, type InstancedMesh } from "three"
import { useEditorStore } from "../store"
import { GRID, isEdgeType, isMarker, isWallMounted, type ObjectType } from "../types"
import { getItem } from "../catalog/items"

/** Just above rugs (their top is 0.014), so a piece on a rug shades it too. */
const HEIGHT = 0.016
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
        const offsetX = Math.abs((x + 0.5) / size - 0.5) * 2
        const offsetY = Math.abs((y + 0.5) / size - 0.5) * 2
        const distance = Math.pow(offsetX ** 4 + offsetY ** 4, 0.25)
        const falloff = Math.min(1, Math.max(0, (distance - 0.35) / 0.65))
        const alpha = 1 - falloff * falloff * (3 - 2 * falloff)
        // An alpha map is read from the green channel: grey levels, not alpha.
        const level = Math.round(alpha * 255)
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
  const objects = useEditorStore((state) => state.objects)
  const invalidate = useThree((state) => state.invalidate)
  const ref = useRef<InstancedMesh>(null)
  const texture = useMemo(createBlobTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  const pieces = useMemo(
    () =>
      objects.filter(
        (object) =>
          !isEdgeType(object.type) &&
          !isMarker(object.type) &&
          !isWallMounted(object.type) &&
          !UNGROUNDED.has(object.type)
      ),
    [objects]
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    pieces.forEach((object, i) => {
      // The piece's own footprint, turned with it (on the diagonal too).
      const [cellsX, cellsZ] = getItem(object.type).footprint
      dummy.position.set(object.x, HEIGHT, object.z)
      dummy.rotation.set(-Math.PI / 2, 0, object.rotation, "YXZ")
      dummy.scale.set(cellsX * GRID * SPREAD, cellsZ * GRID * SPREAD, 1)
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
