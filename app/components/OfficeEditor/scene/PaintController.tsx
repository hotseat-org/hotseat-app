import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Object3D, Plane, Vector3, type InstancedMesh } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { SEG, enclosedRegions, wallLine } from "../layout"
import { isEdgeType, type Cell } from "../types"
import { useSurfaces } from "../sceneTheme"
import { intersectEdge } from "./wallHit"
import { GhostObject } from "./GhostObject"

const GROUND = new Plane(new Vector3(0, 1, 0), 0)
const dummy = new Object3D()

type Target =
  | { kind: "wall"; ids: string[] }
  | { kind: "floor"; cells: Cell[]; x: number; z: number }
  | null

/**
 * Paint tool. Points at a wall → its whole straight line (Shift: one segment);
 * otherwise at a room's floor → that room. Previews the paint, click applies.
 */
export const PaintController = () => {
  const { camera, raycaster, pointer, gl, invalidate } = useThree()
  const store = useEditorStoreApi()
  const objects = useEditorStore((s) => s.objects)
  const paintColor = useEditorStore((s) => s.paintColor)
  const surfaces = useSurfaces()
  const [target, setTarget] = useState<Target>(null)
  const targetRef = useRef<Target>(null)
  targetRef.current = target
  const shift = useRef(false)
  const lastKey = useRef("")
  const regions = useMemo(() => enclosedRegions(objects), [objects])

  // Track Shift from pointer events; redraw on move (frameloop="demand").
  useEffect(() => {
    const el = gl.domElement
    const move = (e: PointerEvent) => {
      shift.current = e.shiftKey
      invalidate()
    }
    const down = (e: PointerEvent) => {
      const t = targetRef.current
      if (e.button !== 0 || !t) return
      const s = store.getState()
      if (t.kind === "wall") s.paintWalls(t.ids, s.paintColor)
      else s.paintFloor(t.x, t.z, s.paintColor)
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerdown", down)
    return () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerdown", down)
    }
  }, [gl, invalidate, store])

  const hit = useMemo(() => new Vector3(), [])

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera)
    const ray = raycaster.ray
    const all = store.getState().objects

    // Nearest wall/opening the ray passes through.
    let best: { id: string; d: number } | null = null
    for (const o of all) {
      if (!isEdgeType(o.type)) continue
      if (!intersectEdge(ray, o, hit)) continue
      const d = hit.distanceTo(ray.origin)
      if (!best || d < best.d) best = { id: o.id, d }
    }

    let next: Target = null
    if (best) {
      const seg = all.find((o) => o.id === best.id)
      const ids = shift.current && seg?.type === "wall" ? [best.id] : wallLine(all, best.id)
      if (ids.length) next = { kind: "wall", ids }
    } else if (ray.intersectPlane(GROUND, hit)) {
      const region = regions.find((r) =>
        r.some((c) => c.x <= hit.x && hit.x < c.x + SEG && c.z <= hit.z && hit.z < c.z + SEG)
      )
      if (region) next = { kind: "floor", cells: region, x: hit.x, z: hit.z }
    }

    const key = !next
      ? ""
      : next.kind === "wall"
        ? `w:${next.ids.join(",")}`
        : `f:${next.cells[0].x},${next.cells[0].z},${next.cells.length}`
    if (key !== lastKey.current) {
      lastKey.current = key
      setTarget(next)
    } else if (next?.kind === "floor") {
      // Same room, new spot — keep the click position current (no re-render).
      targetRef.current = next
    }
  })

  if (!target) return null
  const color = paintColor ?? (target.kind === "wall" ? surfaces.wall : surfaces.floorInside)
  if (target.kind === "wall") {
    const ids = new Set(target.ids)
    return (
      <>
        {objects
          .filter((o) => ids.has(o.id))
          .map((o) => (
            <GhostObject
              key={o.id}
              type="wall"
              x={o.x}
              z={o.z}
              rotation={o.rotation}
              tint={color}
              scale={1.04}
            />
          ))}
      </>
    )
  }
  return <FloorPreview cells={target.cells} color={color} />
}

/** Translucent overlay of a room's floor in the paint colour. */
const FloorPreview = ({ cells, color }: { cells: Cell[]; color: string }) => {
  const ref = useRef<InstancedMesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    cells.forEach((c, i) => {
      dummy.position.set(c.x + SEG / 2, 0.012, c.z + SEG / 2)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    invalidate()
  }, [cells, invalidate])
  return (
    <instancedMesh key={cells.length} ref={ref} args={[undefined, undefined, cells.length]}>
      <planeGeometry args={[SEG, SEG]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  )
}
