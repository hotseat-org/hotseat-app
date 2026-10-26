import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Object3D, Plane, Vector3, type InstancedMesh } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { SEG, enclosedRegions, roomWalls, wallBetweenJoints, type WallPaint } from "../layout"
import { isEdgeType, type Cell } from "../types"
import { useSurfaces } from "../sceneTheme"
import { intersectEdge } from "./wallHit"

const GROUND = new Plane(new Vector3(0, 1, 0), 0)
const dummy = new Object3D()
type Target =
  | { kind: "wall"; targets: WallPaint[] }
  | { kind: "floor"; cells: Cell[]; x: number; z: number }
  | null

/**
 * Paint tool. Points at a wall → that wall, corner to corner (Shift: the inside
 * of the room on the side you look from — the faces of its walls facing in);
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
      if (t.kind === "wall") s.paintWalls(t.targets, s.paintColor)
      else s.paintFloor(t.x, t.z, s.paintColor)
    }
    // Shift switches between a wall and its room at once, without a move.
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Shift") return
      shift.current = e.type === "keydown"
      invalidate()
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerdown", down)
    window.addEventListener("keydown", key)
    window.addEventListener("keyup", key)
    return () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("keydown", key)
      window.removeEventListener("keyup", key)
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
      // A wall, corner to corner; Shift: the inside of the room on the side you
      // look from.
      const targets =
        (shift.current && roomWalls(all, regions, best.id, ray.origin)) ||
        wallBetweenJoints(all, best.id).map((id) => ({ id }))
      if (targets.length) next = { kind: "wall", targets }
    } else if (ray.intersectPlane(GROUND, hit)) {
      const region = regions.find((r) =>
        r.some((c) => c.x <= hit.x && hit.x < c.x + SEG && c.z <= hit.z && hit.z < c.z + SEG)
      )
      if (region) next = { kind: "floor", cells: region, x: hit.x, z: hit.z }
    }

    const key = !next
      ? ""
      : next.kind === "wall"
        ? `w:${next.targets.map((t) => `${t.id}${t.face ?? ""}`).join(",")}`
        : `f:${next.cells[0].x},${next.cells[0].z},${next.cells.length}`
    if (key !== lastKey.current) {
      lastKey.current = key
      setTarget(next)
    } else if (next?.kind === "floor") {
      // Same room, new spot — keep the click position current (no re-render).
      targetRef.current = next
    }
  })

  // Walls: shown in the paint on the walls themselves (merged, as they'd look —
  // with their doors, windows and joints), not as a ghost over them.
  const setPaintPreview = useEditorStore((s) => s.setPaintPreview)
  useEffect(() => {
    setPaintPreview(target?.kind === "wall" ? { targets: target.targets, color: paintColor } : null)
  }, [target, paintColor, setPaintPreview])
  useEffect(() => () => setPaintPreview(null), [setPaintPreview])

  if (target?.kind !== "floor") return null
  return <FloorPreview cells={target.cells} color={paintColor ?? surfaces.floorInside} />
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
