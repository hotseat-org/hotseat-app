import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { Plane, Vector3 } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { edgeNodes, nearestEdgeId, openingPlan } from "../layout"
import { isOpening, isWall, type SceneObject } from "../types"
import { WALL } from "../objects/dimensions"
import { GhostObject } from "../building/GhostObject"
import { NodeMarker } from "../building/WallGhost"

const BUILD = "#3b82f6"
/** Track the cursor at mid-wall height, so pointing AT a wall picks that wall. */
const MID_WALL = new Plane(new Vector3(0, 1, 0), -WALL.height / 2)

interface Props {
  /** The lifted door/window being carried. */
  carried: SceneObject
  /** Called once it's placed (or put back). */
  onDone: () => void
}

/**
 * Carries a lifted door/window along the walls: previews it in the wall pair
 * under the cursor (any two neighbouring wall halves), and places it there on
 * click. Esc puts it back where it came from (via the parent).
 */
export const OpeningCarry = ({ carried, onDone }: Props) => {
  const { camera, raycaster, pointer, gl: renderer, invalidate } = useThree()
  const store = useEditorStoreApi()
  const objects = useEditorStore((state) => state.objects)
  const hit = useMemo(() => new Vector3(), [])
  const raw = useRef<{ x: number; z: number } | null>(null)
  const [slotKey, setSlotKey] = useState("")

  const slotAt = (x: number, z: number) => {
    if (!isOpening(carried.type)) return null

    const all = store.getState().objects
    const wallId = nearestEdgeId(
      all,
      { x, z },
      { maxDistance: 0.6, accept: (wall) => isWall(wall.type) }
    )
    const plan = wallId
      ? openingPlan(all, { id: wallId, kind: carried.type, point: { x, z } })
      : null

    return plan ? plan.add[0] : null
  }

  useFrame(() => {
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(MID_WALL, hit)) return

    raw.current = { x: hit.x, z: hit.z }
    const slot = slotAt(hit.x, hit.z)
    const key = slot ? `${slot.x},${slot.z},${slot.rotation}` : ""
    if (key !== slotKey) setSlotKey(key)
  })

  useEffect(() => {
    const element = renderer.domElement
    const move = () => invalidate()
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !raw.current) return
      if (!store.getState().placeOpening(carried, raw.current.x, raw.current.z)) return

      // Consumed: don't let this click reach R3F (the floor would deselect the
      // opening that was just placed and selected).
      event.stopPropagation()
      onDone()
    }
    element.addEventListener("pointermove", move)
    element.addEventListener("pointerdown", down)

    return () => {
      element.removeEventListener("pointermove", move)
      element.removeEventListener("pointerdown", down)
    }
  }, [renderer, invalidate, store, carried, onDone])

  const slot = slotKey && raw.current ? slotAt(raw.current.x, raw.current.z) : null
  if (!slot) return null

  const [startNode, endNode] = edgeNodes({ ...slot, id: "" })
  // `objects` keeps the preview in sync with edits made while carrying.
  void objects

  return (
    <>
      <GhostObject
        type={slot.type}
        x={slot.x}
        z={slot.z}
        rotation={slot.rotation}
        color={carried.color}
      />
      <NodeMarker x={startNode.x} z={startNode.z} color={BUILD} />
      <NodeMarker x={endNode.x} z={endNode.z} color={BUILD} />
    </>
  )
}
