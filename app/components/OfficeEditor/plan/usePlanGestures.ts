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
    (factor: number, cx: number, cy: number) =>
      setView((v) => {
        if (!v) return v
        const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor))
        const f = k / v.k
        return { k, tx: cx - (cx - v.tx) * f, ty: cy - (cy - v.ty) * f }
      }),
    [setView]
  )

  // Same reading as the 3D view: wheel, two-finger scroll and pinch all zoom.
  // (⌥ + scroll orbits there; quarter turns don't scroll, so it's ignored here.)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const readWheel = createWheelReader()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const intent = readWheel(e)
      if (intent === "rotate" || e.deltaY === 0) return
      const r = el.getBoundingClientRect()
      const factor =
        intent === "smoothZoom" ? getSmoothZoomFactor(e.deltaY) : getStepZoomFactor(e.deltaY)
      zoomAt(factor, e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [box, zoomAt])

  // Keys, as in the 3D view: Q / E turn (a quarter turn here), + / − zoom.
  const turnByRef = useRef(turnBy)
  turnByRef.current = turnBy
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "q") return turnByRef.current(1)
      if (k === "e") return turnByRef.current(-1)
      const el = box.current
      const factor = k === "+" || k === "=" ? 1.25 : k === "-" || k === "_" ? 1 / 1.25 : 0
      if (factor && el) zoomAt(factor, el.clientWidth / 2, el.clientHeight / 2)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [box, zoomAt])

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // One set of window listeners serves every finger (a second finger just
    // joins the gesture as a pinch).
    if (pointers.current.size > 1) return
    moved.current = false
    const start = { x: e.clientX, y: e.clientY }
    const el = box.current
    const move = (ev: PointerEvent) => {
      const prev = pointers.current.get(ev.pointerId)
      if (!prev) return
      const all = [...pointers.current.values()]
      if (pointers.current.size === 2 && el) {
        // Pinch: scale by the change in finger spread, around their midpoint.
        const other = all.find((p) => p !== prev) as { x: number; y: number }
        const before = Math.hypot(prev.x - other.x, prev.y - other.y)
        const after = Math.hypot(ev.clientX - other.x, ev.clientY - other.y)
        const r = el.getBoundingClientRect()
        if (before > 0)
          zoomAt(
            after / before,
            (ev.clientX + other.x) / 2 - r.left,
            (ev.clientY + other.y) / 2 - r.top
          )
        moved.current = true
      } else {
        if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > DRAG) moved.current = true
        if (moved.current) {
          const dx = ev.clientX - prev.x
          const dy = ev.clientY - prev.y
          setView((v) => v && { ...v, tx: v.tx + dx, ty: v.ty + dy })
        }
      }
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    }
    const up = (ev: PointerEvent) => {
      pointers.current.delete(ev.pointerId)
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
