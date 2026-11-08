import clsx from "clsx"
import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from "react"

/**
 * A scrolling area that shows there's more: a soft shadow at its top or
 * bottom edge while it can scroll that way (none when it all fits). The
 * shadow is the foreground's, faint, so it sits on any surface, light or dark.
 */
export const ScrollArea = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode
    /** The scrolling element's (its padding, gap, layout). */
    className?: string
    /** The frame's, around it (its size in the layout). */
    frameClassName?: string
  }
>(({ children, className, frameClassName }, forwardedRef) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const edges = useScrollEdges(scrollRef)
  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element
      if (typeof forwardedRef === "function") forwardedRef(element)
      else if (forwardedRef) forwardedRef.current = element
    },
    [forwardedRef]
  )

  return (
    <div className={clsx("relative flex min-h-0 flex-col", frameClassName)}>
      <div
        ref={setRefs}
        // Where there's more: on the ground, the words fade at that edge (see tailwind.css).
        data-more-above={edges.hasMoreAbove || undefined}
        data-more-below={edges.hasMoreBelow || undefined}
        className={clsx("min-h-0 flex-1 overflow-y-auto", className)}
      >
        {children}
      </div>
      <ScrollShadow side="top" isShown={edges.hasMoreAbove} />
      <ScrollShadow side="bottom" isShown={edges.hasMoreBelow} />
    </div>
  )
})
ScrollArea.displayName = "ScrollArea"

/** A faint shadow along an edge with more beyond it. */
const ScrollShadow = ({ side, isShown }: { side: "top" | "bottom"; isShown: boolean }) => (
  <span
    aria-hidden
    className={clsx(
      "scroll-shadow pointer-events-none absolute inset-x-0 z-10 h-4 transition-opacity duration-200",
      side === "top" ? "top-0" : "bottom-0",
      isShown ? "opacity-100" : "opacity-0"
    )}
    style={{
      background: `linear-gradient(to ${side === "top" ? "bottom" : "top"}, color-mix(in oklab, var(--foreground) 14%, transparent), transparent)`,
    }}
  />
)

/** Room left at an edge still counted as "at it" (px): rounding, sub-pixel layouts. */
const EDGE_SLACK = 2

/**
 * Whether an element can scroll further up or down — kept as it scrolls,
 * resizes or its content changes. One frame's work at most per scroll.
 */
export const useScrollEdges = (ref: React.RefObject<HTMLElement | null>) => {
  const [edges, setEdges] = useState({ hasMoreAbove: false, hasMoreBelow: false })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    const measure = () => {
      frame = 0
      const hasMoreAbove = element.scrollTop > EDGE_SLACK
      const hasMoreBelow =
        element.scrollHeight - element.clientHeight - element.scrollTop > EDGE_SLACK
      setEdges((current) =>
        current.hasMoreAbove === hasMoreAbove && current.hasMoreBelow === hasMoreBelow
          ? current
          : { hasMoreAbove, hasMoreBelow }
      )
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    element.addEventListener("scroll", schedule, { passive: true })
    // Its own size, and its content's (a list arriving, a section opening).
    const resizes = new ResizeObserver(schedule)
    resizes.observe(element)
    const changes = new MutationObserver(schedule)
    changes.observe(element, { childList: true, subtree: true })

    return () => {
      element.removeEventListener("scroll", schedule)
      resizes.disconnect()
      changes.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [ref])

  return edges
}
