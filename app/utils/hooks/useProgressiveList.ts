import { useCallback, useEffect, useRef, useState } from "react"

/** Rows rendered at first, and added each time the end comes near. */
const PAGE_SIZE = 60

/**
 * A long list rendered a page at a time: the first rows at once, more as the
 * end of the list scrolls near (a marker element, `endRef`, watched in its
 * scrolling box). Starts over when `resetKey` changes (a search, a filter).
 * Hundreds of people stay quick to open: only what's seen is drawn.
 */
export const useProgressiveList = <Item>(items: Item[], resetKey = "", pageSize = PAGE_SIZE) => {
  const [count, setCount] = useState(pageSize)
  const observer = useRef<IntersectionObserver | null>(null)

  // Another list (searched, filtered): back to its first page.
  useEffect(() => setCount(pageSize), [resetKey, pageSize])

  const endRef = useCallback(
    (marker: HTMLElement | null) => {
      observer.current?.disconnect()
      if (!marker) return

      observer.current = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setCount((current) => current + pageSize)
        },
        // A screen ahead: the next page is there before it's scrolled to.
        { rootMargin: "600px 0px" }
      )
      observer.current.observe(marker)
    },
    [pageSize]
  )

  useEffect(() => () => observer.current?.disconnect(), [])

  return {
    shown: items.slice(0, count),
    /** More to come: render the marker (with `endRef`) after the rows. */
    hasMore: items.length > count,
    endRef,
  }
}
