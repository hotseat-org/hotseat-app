import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import { lerp } from "../math"
import { type Bounds, type Insets, type View } from "./planView"

/** How long a glide takes (ms). */
export const GLIDE_MS = 450

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
        const progress = reduced ? 1 : Math.min(1, (now - start) / GLIDE_MS)
        const eased = 1 - (1 - progress) ** 3
        setView({
          zoom: lerp(from.zoom, to.zoom, eased),
          offsetX: lerp(from.offsetX, to.offsetX, eased),
          offsetY: lerp(from.offsetY, to.offsetY, eased),
        })
        if (progress < 1) frame.current = requestAnimationFrame(step)
      }
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(step)
    },
    [setView]
  )
}
