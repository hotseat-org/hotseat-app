/**
 * What a wheel event means. Browsers send mouse wheels, trackpad scrolls and
 * pinches as the same `wheel` event, so they're told apart here:
 * - `smoothZoom` — trackpad pinch (the browser sets `ctrlKey`; so does Ctrl +
 *   wheel) or two-finger scroll: zoom in proportion to the fingers' travel
 * - `stepZoom` — one mouse wheel notch: one fixed zoom step
 * - `rotate` — ⌥/Alt + scroll, either device
 */
export type WheelIntent = "smoothZoom" | "stepZoom" | "rotate"

/** Events closer together than this (ms) belong to one gesture. */
const GESTURE_GAP = 200
/** A mouse notch scrolls at least this far (px); a trackpad gesture starts smaller. */
const MIN_NOTCH = 50

const isMac = () => typeof navigator !== "undefined" && /Mac/.test(navigator.platform)

/**
 * Reads wheel events into intents. Which device is scrolling is sticky: only a
 * clear sign switches it (sideways scroll → trackpad; a line-based or big first
 * step → mouse), so a gesture never flips between smooth and stepped zoom.
 * Macs start out assuming a trackpad, everything else a mouse.
 */
export const createWheelReader = () => {
  let device: "mouse" | "trackpad" = isMac() ? "trackpad" : "mouse"
  let prevTime = -Infinity

  return (event: WheelEvent): WheelIntent => {
    const isGestureStart = event.timeStamp - prevTime > GESTURE_GAP
    prevTime = event.timeStamp
    if (event.ctrlKey) return "smoothZoom"

    // Shift + wheel turns a mouse's vertical scroll sideways — not a trackpad sign.
    const isSideways = event.deltaX !== 0 && !event.shiftKey
    const isNotch = isGestureStart && !isSideways && Math.abs(event.deltaY) >= MIN_NOTCH
    if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || isNotch) device = "mouse"
    else if (isSideways) device = "trackpad"

    if (event.altKey) return "rotate"
    return device === "mouse" ? "stepZoom" : "smoothZoom"
  }
}

/** Zoom factor for a pinch / two-finger scroll event (continuous deltas; capped for Ctrl + wheel). */
export const getSmoothZoomFactor = (deltaY: number) =>
  Math.exp(-Math.max(-30, Math.min(30, deltaY)) * 0.01)

/** Zoom factor for one mouse wheel notch, whatever its size on this platform. */
export const getStepZoomFactor = (deltaY: number) => (deltaY < 0 ? 1.15 : 1 / 1.15)
