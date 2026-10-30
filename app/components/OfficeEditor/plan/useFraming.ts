import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react"
import { useEditorStore } from "../store"
import { routeBounds } from "../wayfinding"
import { MAX_K, fitView, type Bounds, type Insets, type View } from "./planView"

/** Bringing a desk into view: at least this zoom (px per plan unit)… */
const SPOTLIGHT_K = 44
/** …gliding there over this long (ms); the highlight then ripples this long. */
const SPOTLIGHT_GLIDE_MS = 450
const SPOTLIGHT_MS = 2700

/** What framing goes by, as of the last render (read in effects, so it doesn't re-run them). */
export interface Frame {
  /** The plan's size on screen (px), once measured. */
  size: { width: number; height: number } | null
  /** The drawing's bounds (plan units), once it has content. */
  bounds: Bounds | null
  insets: Insets
}

/** Glides the view from one place to another (instant with reduced motion). */
export const useGlide = (setView: Dispatch<SetStateAction<View | null>>) => {
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return useCallback(
    (from: View, to: View) => {
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
      const start = performance.now()
      const step = (now: number) => {
        const progress = reduced ? 1 : Math.min(1, (now - start) / SPOTLIGHT_GLIDE_MS)
        const eased = 1 - (1 - progress) ** 3
        setView({
          zoom: from.zoom + (to.zoom - from.zoom) * eased,
          offsetX: from.offsetX + (to.offsetX - from.offsetX) * eased,
          offsetY: from.offsetY + (to.offsetY - from.offsetY) * eased,
        })
        if (progress < 1) frame.current = requestAnimationFrame(step)
      }
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(step)
    },
    [setView]
  )
}

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
    const zoom = Math.min(MAX_K, Math.max(from.zoom, SPOTLIGHT_K))
    const centreX = padding.left + (size.width - padding.left - padding.right) / 2
    const centreY = padding.top + (size.height - padding.top - padding.bottom) / 2
    const to = { zoom, offsetX: centreX - target.x * zoom, offsetY: centreY - target.z * zoom }
    // Clearing the request re-runs this effect: the glide outlives it.
    clearTimeout(timer.current)
    glideTo(from, to)
    setHighlightId(spotlight.id)
    timer.current = setTimeout(() => setHighlightId(null), SPOTLIGHT_GLIDE_MS + SPOTLIGHT_MS)
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
        { x0: bounds.x0, x1: bounds.x1, y0: bounds.z0, y1: bounds.z1 },
        size.width,
        size.height,
        padding
      )
    )
    // Only when a way is asked for (or the plan first has a view) — not on every pan.
  }, [routeNonce, hasView])
}
