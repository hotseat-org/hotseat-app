import { CloseButton } from "@heroui/react"
import clsx from "clsx"
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { createPortal } from "react-dom"
import { useDimmedPageColor } from "./useDimmedPageColor"
import { useSwipeToClose } from "./useSwipeToClose"
import { useI18n } from "~/i18n/I18nProvider"

/** A sheet's slide-out (the `sheet-down` animation in tailwind.css), ms. */
export const SHEET_EXIT_MS = 140

/** The status-bar strip's depth (px): Safari ignores 10px or less. */
const STRIP_HEIGHT = 11

/** An element's height (px), kept up to date. */
const useHeight = (element: RefObject<HTMLElement | null>) => {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (!element.current) return

    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height))
    observer.observe(element.current)

    return () => observer.disconnect()
  }, [element])

  return height
}

/**
 * A sheet up from the bottom of the screen — a phone's dialog: its title
 * with a close button (or, without one, the content brings its own top, a
 * banner), and what it holds — given `close`, which slides it away before
 * it goes. Swipe its top down, tap the dimmed screen or press Escape to
 * close it too.
 */
export const BottomSheet = ({
  title,
  label,
  isFlush = false,
  isTall = false,
  bottomInset = 0,
  onClose,
  children,
}: {
  title?: string
  /** Its accessible name (unset: the title). */
  label?: string
  /** No padding: the content runs edge to edge (a banner on top). */
  isFlush?: boolean
  /** A fixed height (most of the screen), for lists that load: it never jumps. */
  isTall?: boolean
  /** What it stands above and leaves showing (px): a phone's tab bar. */
  bottomInset?: number
  onClose: () => void
  children: (close: () => void) => ReactNode
}) => {
  const { t } = useI18n()
  const [isClosing, setIsClosing] = useState(false)
  const close = () => {
    setIsClosing(true)
    window.setTimeout(onClose, SHEET_EXIT_MS)
  }
  const swipe = useSwipeToClose(close)
  const scrim = useRef<HTMLButtonElement>(null)
  const dimmedPageColor = useDimmedPageColor(scrim)
  const panel = useRef<HTMLDivElement>(null)
  const panelHeight = useHeight(panel)
  // The screen's dimming goes with the sheet: lighter as it's pulled down, and
  // gone as it slides away — not all at once when it's gone.
  const dimming = isClosing ? 0 : 1 - Math.min(1, swipe.offset / Math.max(1, panelHeight))
  const dimmingStyle: CSSProperties = {
    opacity: dimming,
    transition:
      swipe.offset > 0 && !isClosing
        ? "none"
        : `opacity ${isClosing ? `${SHEET_EXIT_MS}ms ease-in` : "200ms ease-out"}`,
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close()
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Portalled: a shell's backdrop blur would otherwise be the fixed sheet's
  // containing block, squeezing it into the shell.
  return createPortal(
    <div
      // Above a tab bar, the sheet comes out from behind it and casts no
      // shadow over it: whatever passes below the bar is cut off.
      className={clsx(
        "fixed inset-x-0 top-0 z-50 flex flex-col justify-end",
        bottomInset > 0 && "overflow-hidden"
      )}
      style={{ bottom: bottomInset }}
    >
      {/* Fixed itself and empty: inside the fixed wrapper, Safari (iOS 26)
          found the wrapper, colourless, and kept its old tint. */}
      <button
        ref={scrim}
        type="button"
        aria-label={t("Close")}
        className="fixed inset-x-0 bg-scrim"
        // Below the status-bar strip, which dims that band itself (dimmed
        // twice, it would show darker there while fading).
        style={{ top: dimmedPageColor ? STRIP_HEIGHT : 0, bottom: bottomInset, ...dimmingStyle }}
        onClick={close}
      />
      {/* Safari's status bar: the page as it shows dimmed, opaque, in a strip
          just deep enough for it (over 10px) and clear of a top bar's content
          (see useDimmedPageColor). */}
      {dimmedPageColor && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0"
          style={{ height: STRIP_HEIGHT, backgroundColor: dimmedPageColor, ...dimmingStyle }}
        />
      )}
      <div
        ref={panel}
        className={clsx("relative flex flex-col", isTall ? "h-[85dvh]" : "max-h-[92dvh]")}
        style={swipe.style}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={label ?? title}
          className={clsx(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl border-t border-border bg-overlay",
            // Above a tab bar, a shadow upwards only: the wrapper's clipping
            // didn't hold in Safari, which cast it over the bar.
            bottomInset > 0 ? "shadow-[0_-12px_24px_-12px_var(--chrome-shadow)]" : "shadow-overlay",
            !isFlush && "gap-3 px-5 pb-7 pt-2.5",
            isClosing ? "sheet-down" : "sheet-up"
          )}
        >
          {/* The top: swipe it down to close. */}
          {title ? (
            <div {...swipe.handlers} className="flex shrink-0 touch-none flex-col gap-3">
              <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-foreground">{title}</h2>
                <CloseButton aria-label={t("Close")} onPress={close} className="size-10" />
              </div>
            </div>
          ) : (
            <div
              {...swipe.handlers}
              // A grab zone round the handle, clear of the banner's own close button.
              className="absolute left-1/2 top-0 z-10 flex h-8 w-28 -translate-x-1/2 touch-none justify-center pt-2.5"
            >
              <span aria-hidden className="h-1.5 w-10 rounded-full bg-white/70 shadow-sm" />
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            {children(close)}
          </div>
          {/* Safari tints its toolbar from a fixed element (over 10px) at the
              screen's bottom edge: the sheet's colour, over its bottom padding.
              Above a tab bar, the bar is it. */}
          {bottomInset === 0 && (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-x-0 bottom-0 h-3 bg-overlay"
            />
          )}
        </section>
      </div>
    </div>,
    document.body
  )
}
