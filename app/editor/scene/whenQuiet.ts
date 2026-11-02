/** How long with no pointer, wheel or key input before the page counts as quiet (ms). */
const QUIET = 1500
/** How long idle time is waited for at most, once it's quiet (ms). */
const IDLE_WAIT = 1000

// The last input — the editor's load counts as one (it's busy then anyway).
let lastInputAt = typeof performance === "undefined" ? 0 : performance.now()
let isListening = false
const noteInput = () => {
  lastInputAt = performance.now()
}
const listen = () => {
  if (isListening) return

  isListening = true
  for (const type of ["pointermove", "pointerdown", "wheel", "keydown"])
    window.addEventListener(type, noteInput, { passive: true, capture: true })
}

/** Runs `callback` in idle time, or after `timeout` (ms); returns how to call it off. */
export const whenIdle = (callback: () => void, timeout: number) => {
  if (typeof window.requestIdleCallback !== "function") {
    const timer = window.setTimeout(callback, Math.min(timeout, 200))

    return () => window.clearTimeout(timer)
  }

  const handle = window.requestIdleCallback(callback, { timeout })

  return () => window.cancelIdleCallback(handle)
}

/**
 * Runs `callback` once nobody has touched the page for a moment (QUIET), in
 * idle time: for work done ahead, which mustn't stall someone using the
 * scene — the browser is idle between frames even while they orbit. Returns
 * how to call it off.
 */
export const whenQuiet = (callback: () => void) => {
  listen()
  let cancel = () => {}

  const check = () => {
    const wait = lastInputAt + QUIET - performance.now()
    if (wait > 0) {
      const timer = window.setTimeout(check, wait)
      cancel = () => window.clearTimeout(timer)

      return
    }

    // Touched again while waiting for idle time: wait for quiet again.
    cancel = whenIdle(
      () => (performance.now() - lastInputAt < QUIET ? check() : callback()),
      IDLE_WAIT
    )
  }
  check()

  return () => cancel()
}
