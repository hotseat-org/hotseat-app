import { useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Object3D, type InstancedMesh } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { SEG, enclosedRegions } from "../layout"
import { isEdgeType, type Cell } from "../types"
import { useSurfaces } from "../sceneTheme"

const dummy = new Object3D()

/**
 * Tints the floor inside the walls a different colour from the exterior — per
 * ROOM: a room with a floor-paint marker in it uses that colour. Renders one
 * instanced mesh of flat tiles per colour, just above the base floor (below the
 * edit grid).
 */
export const InteriorFloor = () => {
  // Rooms depend only on walls/doors/windows and floor paints — a key of those,
  // so moving furniture doesn't re-run the flood fill.
  const key = useEditorStore((s) =>
    s.objects
      .filter((o) => isEdgeType(o.type) || o.type === "floorPaint")
      .map((o) => `${o.type}:${o.x}:${o.z}:${o.rotation}:${o.color ?? ""}`)
      .join("|")
  )
  const store = useEditorStoreApi()
  const surfaces = useSurfaces()
  const groups = useMemo(() => {
    void key // recompute exactly when the rooms can have changed
    const objects = store.getState().objects
    const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
    const byColor = new Map<string, Cell[]>()
    for (const region of enclosedRegions(objects)) {
      // Last paint inside the room wins.
      const paint = [...paints]
        .reverse()
        .find((p) =>
          region.some((c) => c.x <= p.x && p.x < c.x + SEG && c.z <= p.z && p.z < c.z + SEG)
        )
      const color = paint?.color ?? surfaces.floorInside
      byColor.set(color, [...(byColor.get(color) ?? []), ...region])
    }
    return [...byColor]
  }, [key, store, surfaces.floorInside])

  return (
    <>
      {groups.map(([color, cells]) => (
        <FloorTiles key={color} color={color} cells={cells} />
      ))}
    </>
  )
}

/** One colour's worth of interior floor tiles. */
const FloorTiles = ({ color, cells }: { color: string; cells: Cell[] }) => {
  const invalidate = useThree((s) => s.invalidate)
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    cells.forEach((c, i) => {
      dummy.position.set(c.x + SEG / 2, 0.006, c.z + SEG / 2)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = cells.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate() // redraw under frameloop="demand"
  }, [cells, invalidate])

  if (cells.length === 0) return null
  return (
    // Keyed by count so the instance buffer is re-sized when the room grows/shrinks.
    <instancedMesh
      key={cells.length}
      ref={ref}
      args={[undefined, undefined, cells.length]}
      receiveShadow
    >
      <planeGeometry args={[SEG, SEG]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </instancedMesh>
  )
}
