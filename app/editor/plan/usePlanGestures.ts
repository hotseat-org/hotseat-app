import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react"
import { useGesture } from "@use-gesture/react"
import { isTypingTarget } from "../keyboard"
import { clamp } from "../math"
import { createWheelReader, getSmoothZoomFactor, getStepZoomFactor } from "../wheel"
import { MAX_ZOOM, MIN_ZOOM, type View } from "./planView"

/** A press that moves further than this is a pan, not a click (px). */
const DRAG_THRESHOLD = 4

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

        const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM)
        const ratio = zoom / view.zoom

        return {
          zoom,
          offsetX: focusX - (focusX - view.offsetX) * ratio,
          offsetY: focusY - (focusY - view.offsetY) * ratio,
        }
      }),
    [setView]
  )

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

  // Drag pans, two fingers pinch; a press that hardly moves stays a click.
  // Wheels are read here, as in the 3D view: wheel, two-finger scroll and a
  // trackpad pinch all zoom (⌥ + scroll orbits there; quarter turns don't
  // scroll, so it's ignored here).
  const readWheel = useRef(createWheelReader())
  useGesture(
    {
      onPointerDown: () => {
        moved.current = false
      },
      onDrag: ({ delta: [deltaX, deltaY], pinching, tap }) => {
        if (pinching || tap) return

        moved.current = true
        setView(
          (view) =>
            view && { ...view, offsetX: view.offsetX + deltaX, offsetY: view.offsetY + deltaY }
        )
      },
      // Scales by the change in finger spread, around the fingers' midpoint.
      onPinch: ({ da: [spread], origin: [originX, originY], memo: previousSpread }) => {
        moved.current = true
        const rect = box.current?.getBoundingClientRect()
        if (rect && previousSpread > 0)
          zoomAt(spread / previousSpread, originX - rect.left, originY - rect.top)

        return spread
      },
      onWheel: ({ event }) => {
        event.preventDefault()
        const intent = readWheel.current(event)
        if (intent === "rotate" || event.deltaY === 0) return

        const rect = box.current?.getBoundingClientRect()
        if (!rect) return

        const factor =
          intent === "smoothZoom"
            ? getSmoothZoomFactor(event.deltaY)
            : getStepZoomFactor(event.deltaY)
        zoomAt(factor, event.clientX - rect.left, event.clientY - rect.top)
      },
    },
    {
      target: box,
      eventOptions: { passive: false },
      drag: { threshold: DRAG_THRESHOLD, filterTaps: true },
      // Trackpad pinches arrive as wheel events, read above.
      pinch: { pinchOnWheel: false },
    }
  )

  return { moved }
}
