import { CloseButton } from "@heroui/react"
import clsx from "clsx"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useEdgeColors } from "./useEdgeColors"
import { useSwipeToClose } from "./useSwipeToClose"
import { useI18n } from "~/i18n/I18nProvider"

/** A sheet's slide-out (the `sheet-down` animation in tailwind.css), ms. */
export const SHEET_EXIT_MS = 140

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
  const sheet = useRef<HTMLElement>(null)
  const edgeColors = useEdgeColors({ scrim, sheet })
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
      <button
        ref={scrim}
        type="button"
        aria-label={t("Close")}
        className="absolute inset-0 bg-scrim"
        onClick={close}
      />
      {/* For Safari's status bar and toolbar (see useEdgeColors): a pixel of
          what shows at each edge — above a tab bar, the bar is the bottom's. */}
      {edgeColors && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-10 h-px"
            style={{ backgroundColor: edgeColors.top }}
          />
          {bottomInset === 0 && (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-px"
              style={{ backgroundColor: edgeColors.bottom }}
            />
          )}
        </>
      )}
      <div
        className={clsx("relative flex flex-col", isTall ? "h-[85dvh]" : "max-h-[92dvh]")}
        style={swipe.style}
      >
        <section
          ref={sheet}
          role="dialog"
          aria-modal="true"
          aria-label={label ?? title}
          className={clsx(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl border-t border-border bg-overlay shadow-overlay",
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
        </section>
      </div>
    </div>,
    document.body
  )
}
