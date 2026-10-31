import { useRef, useState, type TouchEvent } from "react"

/** How far a finger moves before it's a swipe or not (px). */
const SLOP = 8

interface Origin {
  x: number
  y: number
  time: number
  /** Unknown until the finger has moved SLOP; then whether it's this swipe. */
  isSwiping: boolean | null
}

/**
 * A swipe by touch, right (axis x) or down (axis y), on an element — with
 * plain touch listeners, which leave its buttons alone (a use-gesture
 * binding kept React Aria's buttons inside from ever being pressed).
 * `offset` follows the finger while it swipes; `onRelease` gets how far it
 * went (px) and how fast (px per ms) when it lets go.
 */
export const useTouchSwipe = ({
  axis,
  canStart,
  onRelease,
}: {
  axis: "x" | "y"
  /** Whether a touch starting here may swipe (e.g. only from the screen's edge). */
  canStart?: (x: number, y: number) => boolean
  onRelease: (distance: number, speed: number) => void
}) => {
  const [offset, setOffset] = useState(0)
  const origin = useRef<Origin | null>(null)
  const alongOf = (x: number, y: number, from: Origin) => (axis === "x" ? x - from.x : y - from.y)
  const acrossOf = (x: number, y: number, from: Origin) => (axis === "x" ? y - from.y : x - from.x)

  const handlers = {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0]
      const isOneFinger = event.touches.length === 1
      origin.current =
        isOneFinger && (canStart?.(touch.clientX, touch.clientY) ?? true)
          ? { x: touch.clientX, y: touch.clientY, time: event.timeStamp, isSwiping: null }
          : null
    },
    onTouchMove: (event: TouchEvent) => {
      const from = origin.current
      if (!from) return

      const touch = event.touches[0]
      const along = alongOf(touch.clientX, touch.clientY, from)
      const across = acrossOf(touch.clientX, touch.clientY, from)
      if (from.isSwiping === null && Math.hypot(along, across) > SLOP)
        from.isSwiping = along > 0 && Math.abs(along) > Math.abs(across)

      if (from.isSwiping) setOffset(Math.max(0, along))
    },
    onTouchEnd: (event: TouchEvent) => {
      const from = origin.current
      origin.current = null
      if (!from?.isSwiping) return

      const touch = event.changedTouches[0]
      const distance = alongOf(touch.clientX, touch.clientY, from)
      setOffset(0)
      onRelease(distance, distance / Math.max(1, event.timeStamp - from.time))
    },
    onTouchCancel: () => {
      origin.current = null
      setOffset(0)
    },
  }

  return { handlers, offset }
}
