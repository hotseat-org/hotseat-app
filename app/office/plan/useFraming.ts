import { useEffect, useRef, useState, type RefObject } from "react"
import { routeBounds } from "../wayfinding/wayfinding"
import { useEditorStore } from "~/editor/store"
import { GLIDE_MS, type Frame } from "~/editor/plan/useFraming"
import { MAX_ZOOM, fitView, type View } from "~/editor/plan/planView"

/** Bringing a desk into view: at least this zoom (px per plan unit)… */
const SPOTLIGHT_ZOOM = 44
/** …and, once the glide is over, the highlight ripples this long (ms). */
const SPOTLIGHT_MS = 2700

/**
 * The spotlight ("Show my desk", "Find"): glide to the asked-for desk and
 * ripple on it. Returns the desk being highlighted, if any.
 */
export const useSpotlight = ({
  viewRef,
  frame,
  hasView,
  findSpot,
  glideTo,
}: {
  viewRef: RefObject<View | null>
  frame: RefObject<Frame>
  hasView: boolean
  /** Where a desk is (its occupant's chair, else the desk), in plan units. */
  findSpot: (id: string) => { x: number; z: number } | undefined
  glideTo: (from: View, to: View) => void
}) => {
  const spotlight = useEditorStore((state) => state.spotlight)
  const resetSpotlight = useEditorStore((state) => state.resetSpotlight)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const from = viewRef.current
    const { size: size, insets: padding } = frame.current
    if (!spotlight || !from || !size) return

    resetSpotlight()
    const target = findSpot(spotlight.id)
    if (!target) return

    const zoom = Math.min(MAX_ZOOM, Math.max(from.zoom, SPOTLIGHT_ZOOM))
    const centreX = padding.left + (size.width - padding.left - padding.right) / 2
    const centreY = padding.top + (size.height - padding.top - padding.bottom) / 2
    const to = { zoom, offsetX: centreX - target.x * zoom, offsetY: centreY - target.z * zoom }
    // Clearing the request re-runs this effect: the glide outlives it.
    clearTimeout(timer.current)
    glideTo(from, to)
    setHighlightId(spotlight.id)
    timer.current = setTimeout(() => setHighlightId(null), GLIDE_MS + SPOTLIGHT_MS)
  }, [spotlight, hasView, findSpot, resetSpotlight, glideTo, viewRef, frame])

  return highlightId
}

/** The way to a desk: framed whole once shown (or once the plan first has a view). */
export const useRouteFraming = ({
  routePoints,
  routeNonce,
  hasView,
  viewRef,
  frame,
  glideTo,
}: {
  routePoints: [number, number][] | undefined
  /** Changes each time a way is asked for. */
  routeNonce: number | null
  hasView: boolean
  viewRef: RefObject<View | null>
  frame: RefObject<Frame>
  glideTo: (from: View, to: View) => void
}) => {
  useEffect(() => {
    const from = viewRef.current
    const { size: size, insets: padding } = frame.current
    if (!routePoints || !from || !size) return

    const bounds = routeBounds(routePoints)
    glideTo(
      from,
      fitView(
        { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minZ, maxY: bounds.maxZ },
        size,
        padding
      )
    )
    // Only when a way is asked for (or the plan first has a view) — not on every pan.
  }, [routeNonce, hasView])
}
