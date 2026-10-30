import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react"
import { isTypingTarget } from "../keyboard"
import { createWheelReader, getSmoothZoomFactor, getStepZoomFactor } from "../wheel"
import { MAX_K, MIN_K, type View } from "./planView"

/** A press that moves further than this is a pan, not a click (px). */
const DRAG = 4

/** How much a zoom key (+ / −) scales the plan; 0 for any other key. */
const getKeyZoomFactor = (key: string) => {
  if (key === "+" || key === "=") return 1.25
  if (key === "-" || key === "_") return 1 / 1.25

  return 0
}

/**
 * Pan (drag) and zoom (wheel, pinch, + / −) the plan, and turn it (Q / E) —
 * the same reading as the 3D view. `moved` tells a click from the end of a
 * pan: clicks check it before acting.
 */
export const usePlanGestures = (
  box: RefObject<HTMLDivElement | null>,
  setView: Dispatch<SetStateAction<View | null>>,
  turnBy: (quarters: number) => void
) => {
  const moved = useRef(false)

  const zoomAt = useCallback(
    (factor: number, focusX: number, focusY: number) =>
      setView((view) => {
        if (!view) return view

        const zoom = Math.min(MAX_K, Math.max(MIN_K, view.zoom * factor))
        const ratio = zoom / view.zoom

        return {
          zoom,
          offsetX: focusX - (focusX - view.offsetX) * ratio,
          offsetY: focusY - (focusY - view.offsetY) * ratio,
        }
      }),
    [setView]
  )

  // Same reading as the 3D view: wheel, two-finger scroll and pinch all zoom.
  // (⌥ + scroll orbits there; quarter turns don't scroll, so it's ignored here.)
  useEffect(() => {
    const element = box.current
    if (!element) return

    const readWheel = createWheelReader()
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const intent = readWheel(event)
      if (intent === "rotate" || event.deltaY === 0) return

      const rect = element.getBoundingClientRect()
      const factor =
        intent === "smoothZoom"
          ? getSmoothZoomFactor(event.deltaY)
          : getStepZoomFactor(event.deltaY)
      zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top)
    }
    element.addEventListener("wheel", onWheel, { passive: false })

    return () => element.removeEventListener("wheel", onWheel)
  }, [box, zoomAt])

  // Keys, as in the 3D view: Q / E turn (a quarter turn here), + / − zoom.
  const turnByRef = useRef(turnBy)
  turnByRef.current = turnBy
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return

      const key = event.key.toLowerCase()
      if (key === "q") return turnByRef.current(1)
      if (key === "e") return turnByRef.current(-1)

      const element = box.current
      const factor = getKeyZoomFactor(key)
      if (factor && element) zoomAt(factor, element.clientWidth / 2, element.clientHeight / 2)
    }
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [box, zoomAt])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const onPointerDown = (downEvent: React.PointerEvent) => {
    if (downEvent.button !== 0 && downEvent.pointerType === "mouse") return

    pointers.current.set(downEvent.pointerId, { x: downEvent.clientX, y: downEvent.clientY })
    // One set of window listeners serves every finger (a second finger just
    // joins the gesture as a pinch).
    if (pointers.current.size > 1) return

    moved.current = false
    const start = { x: downEvent.clientX, y: downEvent.clientY }
    const element = box.current
    const move = (moveEvent: PointerEvent) => {
      const prev = pointers.current.get(moveEvent.pointerId)
      if (!prev) return

      const fingers = [...pointers.current.values()]
      if (pointers.current.size === 2 && element) {
        // Pinch: scale by the change in finger spread, around their midpoint.
        const other = fingers.find((pointer) => pointer !== prev) as { x: number; y: number }
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(moveEvent.clientX - other.x, moveEvent.clientY - other.y)
        const rect = element.getBoundingClientRect()
        if (before > 0)
          zoomAt(
            after / before,
            (moveEvent.clientX + other.x) / 2 - rect.left,
            (moveEvent.clientY + other.y) / 2 - rect.top
          )

        moved.current = true
      } else {
        if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) > DRAG)
          moved.current = true
        if (moved.current) {
          const deltaX = moveEvent.clientX - prev.x
          const deltaY = moveEvent.clientY - prev.y
          setView(
            (view) =>
              view && { ...view, offsetX: view.offsetX + deltaX, offsetY: view.offsetY + deltaY }
          )
        }
      }

      pointers.current.set(moveEvent.pointerId, { x: moveEvent.clientX, y: moveEvent.clientY })
    }
    const up = (upEvent: PointerEvent) => {
      pointers.current.delete(upEvent.pointerId)
      if (pointers.current.size > 0) return

      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
  }

  return { moved, onPointerDown }
}
