import { flushSync } from "react-dom"

/**
 * Make a change the browser animates as a view transition (see "Motion" in
 * tailwind.css): what's named moves from how it was to how it is. For changes
 * that aren't a navigation (the router does its own: `viewTransition: true`).
 * Without support, or with reduced motion, the change just happens.
 */
export const withViewTransition = (update: () => void) => {
  const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || isReduced) {
    update()

    return
  }

  document.startViewTransition(() => flushSync(update))
}
