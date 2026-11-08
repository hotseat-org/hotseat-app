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
import { useSwipeToClose } from "./useSwipeToClose"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { useI18n } from "~/i18n/I18nProvider"

/** A sheet's slide-out (the `sheet-down` animation in tailwind.css), ms. */
export const SHEET_EXIT_MS = 140

/** The status-bar strip's depth (px): Safari ignores 10px or less. */
const STRIP_HEIGHT = 11

/**
 * No pull-to-refresh while a sheet is open: pulling a sheet down (not quite
 * on it, or past it) refreshed the page behind instead.
 */
const useNoPullToRefresh = () => {
  useEffect(() => {
    const html = document.documentElement
    const previous = html.style.overscrollBehaviorY
    html.style.overscrollBehaviorY = "none"

    return () => {
      html.style.overscrollBehaviorY = previous
    }
  }, [])
}

/** Whether anything under x, y inside `sheet` is scrolled down from its top. */
const isScrolledDownAt = (x: number, y: number, sheet: HTMLElement | null) => {
  for (
    let element = document.elementFromPoint(x, y);
    element && element !== sheet;
    element = element.parentElement
  )
    if (element.scrollTop > 0) return true

  return false
}

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
  // Pulled down anywhere, like an iPhone's sheets — on content scrolled to
  // the top; scrolled down, a pull scrolls it back up.
  const sheet = useRef<HTMLElement>(null)
  const swipe = useSwipeToClose(close, (x, y) => !isScrolledDownAt(x, y, sheet.current))
  useNoPullToRefresh()
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
        type="button"
        aria-label={t("Close")}
        className="fixed inset-x-0 bg-scrim"
        // Below the status-bar strip, which dims that band itself (dimmed
        // twice, it would show darker there while fading).
        style={{ top: STRIP_HEIGHT, bottom: bottomInset, ...dimmingStyle }}
        onClick={close}
      />
      {/* Safari's status bar (iOS 26): it tints from a fixed element over
          10px deep at the top edge, and re-reads its colour only as the page
          restyles — so the page's edge as it shows dimmed, opaque, worked out
          in CSS (it changes in the same restyle as a theme switch). Just
          deep enough, and clear of a top bar's content. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0"
        style={{
          height: STRIP_HEIGHT,
          backgroundColor:
            "color-mix(in srgb, var(--scrim-tone) var(--scrim-strength), var(--page-edge))",
          ...dimmingStyle,
        }}
      />
      <div
        ref={panel}
        className={clsx("relative flex flex-col", isTall ? "h-[85dvh]" : "max-h-[92dvh]")}
        style={swipe.style}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label={label ?? title}
          ref={sheet}
          {...swipe.handlers}
          className={clsx(
            // No bounce in its lists: pulled down at the top, the sheet moves.
            "relative flex [&_*]:overscroll-y-none min-h-0 flex-1 flex-col overflow-hidden rounded-t-[32px] bg-background",
            // Above a tab bar, a shadow upwards only: the wrapper's clipping
            // didn't hold in Safari, which cast it over the bar.
            bottomInset > 0 ? "shadow-[0_-12px_24px_-12px_var(--chrome-shadow)]" : "shadow-overlay",
            // Named for the headline's controls (see "One set of controls").
            "bottom-sheet",
            !isFlush && clsx("gap-3 px-5 pb-7", title ? "pt-2.5" : "pt-9"),
            isClosing ? "sheet-down" : "sheet-up"
          )}
        >
          {title ? (
            <div className="flex shrink-0 touch-none flex-col gap-3">
              <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-border" />
              <div className="flex items-center justify-between">
                <h2 className="text-[32px] leading-none font-black tracking-[-0.03em] text-foreground">
                  {title}
                </h2>
                <DialogCloseButton onClose={close} />
              </div>
            </div>
          ) : (
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 flex h-8 w-28 -translate-x-1/2 justify-center pt-2.5">
              <span
                aria-hidden
                className={clsx(
                  "h-1.5 w-10 rounded-full",
                  isFlush ? "bg-white/70 shadow-sm" : "bg-border"
                )}
              />
            </div>
          )}
          <ScrollArea frameClassName="flex-1" className="flex flex-col overflow-x-hidden">
            {children(close)}
          </ScrollArea>
          {/* Safari tints its toolbar from a fixed element (over 10px) at the
              screen's bottom edge: the sheet's colour, over its bottom padding.
              Above a tab bar, the bar is it. */}
          {bottomInset === 0 && (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-x-0 bottom-0 h-3 bg-background"
            />
          )}
        </section>
      </div>
    </div>,
    document.body
  )
}
