import type { CSSProperties } from "react"
import { useTouchSwipe } from "./useTouchSwipe"

/** How far a sheet is pulled down before letting go closes it (px). */
const CLOSE_DISTANCE = 100
/** How fast a flick down closes it however short (px per ms). */
const FLICK_SPEED = 0.5

/**
 * Swipe a bottom sheet down to close it, from its top (the grab handle and
 * title — its lists keep scrolling): it follows the finger, and closes past
 * a distance or on a flick down; otherwise it springs back. `handlers` go on
 * the top; `style` on a wrapper round the sheet (the sheet's own transform
 * belongs to its opening animation).
 */
export const useSwipeToClose = (onClose: () => void) => {
  const { handlers, offset } = useTouchSwipe({
    axis: "y",
    onRelease: (distance, speed) => {
      if (distance > CLOSE_DISTANCE || speed > FLICK_SPEED) onClose()
    },
  })
  const style: CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    transition: offset > 0 ? "none" : "transform 200ms ease-out",
  }

  return { handlers, style }
}
