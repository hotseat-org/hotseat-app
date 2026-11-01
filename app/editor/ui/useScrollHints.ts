import { useCallback, useEffect, useState } from "react"

/** How close to an end counts as there (px): sub-pixel scrolling never quite gets there. */
const END_SLACK = 2

/**
 * Whether a scrolling box has more above and below what it shows — kept up
 * to date as it scrolls, resizes or its content changes — and a way to move
 * it by most of what it shows. `box` is its ref: a callback, so a box that
 * comes and goes (the inspector's, with the selection) is followed each time.
 */
export const useScrollHints = <Element extends HTMLElement>() => {
  const [element, box] = useState<Element | null>(null)
  const [hints, setHints] = useState({ canScrollUp: false, canScrollDown: false })

  const update = useCallback(() => {
    if (!element) return

    const canScrollUp = element.scrollTop > END_SLACK
    const canScrollDown =
      element.scrollTop + element.clientHeight < element.scrollHeight - END_SLACK
    setHints((current) =>
      current.canScrollUp === canScrollUp && current.canScrollDown === canScrollDown
        ? current
        : { canScrollUp, canScrollDown }
    )
  }, [element])

  useEffect(() => {
    if (!element) return

    update()
    const resizeObserver = new ResizeObserver(update)
    resizeObserver.observe(element)
    // Its content folding open or shut changes what there is to scroll.
    const mutationObserver = new MutationObserver(update)
    mutationObserver.observe(element, { childList: true, subtree: true })
    element.addEventListener("scroll", update, { passive: true })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      element.removeEventListener("scroll", update)
    }
  }, [element, update])

  /** Up (-1) or down (1) by most of a box's height. */
  const scrollBy = (direction: 1 | -1) =>
    element?.scrollBy({ top: direction * element.clientHeight * 0.8, behavior: "smooth" })

  return { box, ...hints, scrollBy }
}
