import { useDrag } from "@use-gesture/react"
import { useState, type CSSProperties } from "react"

/** How far a sheet is pulled down before letting go closes it (px). */
const CLOSE_DISTANCE = 100
/** How fast a flick down closes it however short (px per ms). */
const FLICK_SPEED = 0.5

/**
 * Swipe a bottom sheet down to close it, from its top (the grab handle and
 * title — its lists keep scrolling): it follows the finger, and closes past
 * a distance or on a flick down; otherwise it springs back. `bind` goes on
 * the top; `style` on a wrapper round the sheet (the sheet's own transform
 * belongs to its opening animation).
 */
export const useSwipeToClose = (onClose: () => void) => {
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const bind = useDrag(
    ({ movement: [, moveY], velocity: [, speedY], direction: [, directionY], last, tap }) => {
      if (tap) return

      const pull = Math.max(0, moveY)
      if (!last) {
        setIsDragging(true)
        setOffset(pull)

        return
      }

      setIsDragging(false)
      const isFlick = speedY > FLICK_SPEED && directionY > 0
      if (pull > CLOSE_DISTANCE || isFlick) onClose()
      else setOffset(0)
    },
    // No pointer capture: a tap on a button in the top (Close) stays the button's.
    { axis: "y", filterTaps: true, pointer: { capture: false } }
  )
  const style: CSSProperties = {
    transform: offset > 0 ? `translateY(${offset}px)` : undefined,
    transition: isDragging ? "none" : "transform 200ms ease-out",
  }

  return { bind, style }
}
