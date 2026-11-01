import { useCallback, useEffect, useRef, useState } from "react"
import type { ThreeEvent } from "@react-three/fiber"
import { Plane, Vector3 } from "three"
import { furnitureCollides } from "../layout"
import { getCollidables, useEditorStoreApi } from "../store"

/** The floor plane: where a grabbed piece is held from. */
const GROUND = new Plane(new Vector3(0, 1, 0), 0)
/** A press that travels further than this (px) drags the piece; less is a click. */
const DRAG_PX = 4

/**
 * Moving furniture: press on a piece and drag it — a plain click only
 * selects. It's held by the spot you grabbed (no jump), and released over a
 * free spot it stays; over other furniture (or on Esc) it goes back. The whole
 * drag is one undo step (none if put back). Leaving edit mode puts it back too.
 */
export const useFurnitureDrag = (readOnly: boolean) => {
  const storeApi = useEditorStoreApi()
  const [dragId, setDragId] = useState<string | null>(null)
  /** The grab point's offset from the piece's centre (plan units). */
  const [grab, setGrab] = useState({ offsetX: 0, offsetZ: 0 })
  // Last refused drop (a timestamp) — the carried object shakes "no".
  const [blockedAt, setBlockedAt] = useState(0)
  /** The piece being dragged (its placement is held apart, see heldPlacement). */
  const draggedId = useRef<string | null>(null)

  const endDrag = () => {
    draggedId.current = null
    setDragId(null)
    storeApi.getState().setHeldPlacement(null)
    storeApi.getState().endBatch() // the whole drag = one undo step (none if put back)
  }

  // Back where it stood: the layout never moved it (see heldPlacement).
  const putBack = () => {
    if (!draggedId.current) return

    endDrag()
  }

  const tryDrop = () => {
    const id = draggedId.current
    if (!id) return

    const state = storeApi.getState()
    const stored = state.objects.find((candidate) => candidate.id === id)
    const held = stored && state.heldPlacement ? { ...stored, ...state.heldPlacement } : null
    if (!held || furnitureCollides(getCollidables(state), held)) {
      setBlockedAt(performance.now())

      return putBack()
    }

    // Set down: into the layout, the one change of the whole carry (none if
    // it's where it stood).
    const hasMoved =
      held.x !== stored?.x || held.z !== stored.z || held.rotation !== stored.rotation
    if (hasMoved) state.moveObject(held.id, held)

    endDrag()
  }

  const handlePick = (id: string, event: ThreeEvent<PointerEvent>) => {
    if (draggedId.current) return

    const object = storeApi.getState().objects.find((candidate) => candidate.id === id)
    if (!object) return

    const hit = event.ray.intersectPlane(GROUND, new Vector3())
    const offset = hit
      ? { offsetX: object.x - hit.x, offsetZ: object.z - hit.z }
      : { offsetX: 0, offsetZ: 0 }
    const { clientX: startX, clientY: startY } = event.nativeEvent
    const move = (moveEvent: PointerEvent) => {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) <= DRAG_PX) return

      window.removeEventListener("pointermove", move)
      draggedId.current = id
      setGrab(offset)
      storeApi.getState().beginBatch()
      storeApi.getState().setHeldPlacement({ x: object.x, z: object.z, rotation: object.rotation })
      setDragId(id)
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      latest.current.tryDrop()
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  // Stable handles for the (memoized) pieces and the window listeners.
  const latest = useRef({ handlePick, tryDrop, putBack })
  latest.current = { handlePick, tryDrop, putBack }

  // Leaving edit mode puts back whatever was being dragged (it'd keep
  // following the cursor in the read-only view otherwise).
  useEffect(() => {
    if (readOnly) latest.current.putBack()
  }, [readOnly])
  // Tell the store what's being carried (R then rotates it freely).
  useEffect(() => {
    storeApi.getState().setCarrying(dragId)
  }, [dragId, storeApi])
  // Esc while dragging: back where it was.
  useEffect(() => {
    if (!dragId) return

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && latest.current.putBack()
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [dragId])

  const onStartDrag = useCallback(
    (id: string, event: ThreeEvent<PointerEvent>) => latest.current.handlePick(id, event),
    []
  )

  return { dragId, grab, blockedAt, onStartDrag }
}
