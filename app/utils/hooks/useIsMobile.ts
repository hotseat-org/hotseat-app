import { useSyncExternalStore } from "react"

/** Phones: below Tailwind's `md` breakpoint. */
const QUERY = "(max-width: 767px)"

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(QUERY)
  list.addEventListener("change", onChange)
  return () => list.removeEventListener("change", onChange)
}

/** Whether the screen is phone-sized (false while server-rendering). */
export const useIsMobile = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  )
