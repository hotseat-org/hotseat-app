/**
 * Ambient motion — steam curling off cups, desk pets' wiggles — needs frames
 * even though the canvas renders on demand. Every frame redraws the whole
 * office, so these small touches must not keep the GPU busy on their own:
 *
 * - one shared ticker asks for frames at a gentle rate (not the display's
 *   60–120 Hz), for every canvas showing something ambient;
 * - it sleeps when nobody's looking: the tab is hidden, the window isn't
 *   focused, or there's been no input for a while. Any input wakes it.
 *
 * A still office then costs nothing.
 */
const FPS = 30
/** No pointer, key or wheel input for this long (ms): stop the ambient motion. */
const IDLE_AFTER = 20_000

const canvases = new Map<() => void, number>()
let timer: ReturnType<typeof setInterval> | null = null
let lastInput = 0
let isListening = false

const handleInput = () => {
  lastInput = performance.now()
}
const INPUTS = ["pointermove", "pointerdown", "keydown", "wheel", "focus"] as const

/**
 * Input is watched from the first ambient touch on, and for good: only input
 * wakes the motion. (It used to start over with each subscription — a desk
 * pet's wiggle every few seconds counted as input, so it never slept.)
 */
const listenForInput = () => {
  if (isListening) return

  isListening = true
  lastInput = performance.now()
  for (const eventName of INPUTS) window.addEventListener(eventName, handleInput, { passive: true })
}

export const isAmbientAwake = () => {
  listenForInput()

  return !document.hidden && document.hasFocus() && performance.now() - lastInput < IDLE_AFTER
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Ask for ambient frames on this canvas (by its `invalidate`) until the returned stop. */
export const subscribeAmbient = (invalidate: () => void) => {
  listenForInput()
  if (!timer)
    timer = setInterval(() => {
      if (!isAmbientAwake()) return

      for (const invalidateCanvas of canvases.keys()) invalidateCanvas()
    }, 1000 / FPS)

  canvases.set(invalidate, (canvases.get(invalidate) ?? 0) + 1)

  return () => {
    const count = (canvases.get(invalidate) ?? 1) - 1
    if (count > 0) canvases.set(invalidate, count)
    else canvases.delete(invalidate)
    if (!canvases.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}
