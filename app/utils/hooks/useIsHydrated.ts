import { useSyncExternalStore } from "react"

const noSubscription = () => () => {}

/** False while server-rendering and hydrating, true after — without an extra effect render. */
export const useIsHydrated = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  )
