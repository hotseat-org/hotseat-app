import { useLayoutEffect, useState } from "react"

/**
 * Whether a page in the office's left column opened in place of another (one
 * closed in the same moment) — then only its content changes (a fade), the
 * panel stays; or afresh — then the panel slides in. ColumnPage and SidePage
 * share it.
 */
let openPages = 0
let lastClosedAt = -Infinity

/** A switch: another page closed within this long before (ms), in the same commit. */
const SWITCH_WINDOW = 80

/** Counts the page while it's open; true when it replaced another. */
export const useIsPageSwitch = () => {
  const [isSwitch] = useState(
    () =>
      typeof performance !== "undefined" &&
      (openPages > 0 || performance.now() - lastClosedAt < SWITCH_WINDOW)
  )

  useLayoutEffect(() => {
    openPages++

    return () => {
      openPages--
      lastClosedAt = performance.now()
    }
  }, [])

  return isSwitch
}
