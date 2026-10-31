import clsx from "clsx"
import { useEffect, useState } from "react"
import { useNavigation } from "react-router"

/** How long a navigation may take before the bar shows (ms): quick ones show nothing. */
const SHOW_AFTER = 150

/**
 * A thin bar along the top while the next page's data loads: it creeps on
 * while waiting, then runs to the end and fades. Only for waits long enough
 * to notice, so a click is never met with silence — and never a flash.
 */
export const NavigationProgress = () => {
  const navigation = useNavigation()
  const isLoading = navigation.state === "loading"
  const [phase, setPhase] = useState<"hidden" | "waiting" | "done">("hidden")

  useEffect(() => {
    if (isLoading) {
      const timeoutId = window.setTimeout(() => setPhase("waiting"), SHOW_AFTER)

      return () => window.clearTimeout(timeoutId)
    }

    setPhase((current) => (current === "waiting" ? "done" : "hidden"))
  }, [isLoading])

  useEffect(() => {
    if (phase !== "done") return

    const timeoutId = window.setTimeout(() => setPhase("hidden"), 400)

    return () => window.clearTimeout(timeoutId)
  }, [phase])

  return (
    <div
      aria-hidden
      className={clsx(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 transition-opacity duration-300",
        phase === "hidden" ? "opacity-0" : "opacity-100"
      )}
    >
      <div
        className={clsx(
          "h-full origin-left bg-accent",
          phase === "waiting" && "navigation-progress",
          phase === "done" && "scale-x-100 transition-transform duration-200",
          phase === "hidden" && "scale-x-0"
        )}
      />
    </div>
  )
}
