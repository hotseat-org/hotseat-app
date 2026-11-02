import clsx from "clsx"
import { useRef, type ReactNode } from "react"
import { FocusScope, useDialog, usePreventScroll } from "react-aria"
import { EdgeStrips } from "./EdgeStrips"

/**
 * A modal that renders where it's written — no portal — so it comes out of
 * the server already open: a direct visit to a URL with a modal shows it in
 * the first paint, before any JavaScript. (React Aria's portal-based Modal
 * renders nothing on the server and appears only after hydration.)
 *
 * Accessibility comes from React Aria's primitives, which all run fine on the
 * server: focus moves to the dialog, is trapped inside and restored on close, the page behind
 * doesn't scroll, Escape and a click on the backdrop close it.
 */
export function InlineModal({
  label,
  onClose,
  children,
  className,
  isFullScreenOnPhone = false,
  layer = "dialog",
}: {
  /** Accessible name of the dialog. */
  label: string
  onClose: () => void
  children: ReactNode
  /** Classes for the dialog box itself (size, layout). */
  className?: string
  /** No margin round the dialog on a phone (it fills the screen there). */
  isFullScreenOnPhone?: boolean
  /**
   * "panel": an office panel (Who's in, My bookings…), a layer under dialogs
   * and settings — which open from inside one and must come out on top.
   */
  layer?: "dialog" | "panel"
}) {
  usePreventScroll()
  const ref = useRef<HTMLDivElement>(null)
  const { dialogProps } = useDialog({ "aria-label": label }, ref)

  return (
    <div
      className={clsx(
        // Its own pointer events: inside a layer that lets clicks through to
        // what's under it (the office's shell), it must still catch them.
        "modal-in-backdrop pointer-events-auto fixed inset-0 grid place-items-center bg-black/50",
        layer === "panel" ? "z-[45]" : "z-50",
        isFullScreenOnPhone ? "p-0 md:p-4" : "p-4"
      )}
      // Only a press that starts and ends on the backdrop itself closes it (a
      // text selection dragged out of the dialog must not).
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.dataset.pressed = "true"
      }}
      onPointerUp={(e) => {
        const started = e.currentTarget.dataset.pressed === "true"
        delete e.currentTarget.dataset.pressed
        if (started && e.target === e.currentTarget) onClose()
      }}
    >
      {/* No autoFocus: useDialog focuses the dialog itself, so opening it
          doesn't paint a focus ring on its first button; Tab goes there next. */}
      <FocusScope contain restoreFocus>
        <div
          {...dialogProps}
          ref={ref}
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "Escape" && !e.defaultPrevented) {
              e.stopPropagation()
              onClose()
            }
          }}
          className={clsx(
            "modal-in relative outline-none",
            // Filling a phone's screen, fixed itself: Safari (iOS 26) tints its
            // status bar and toolbar from the fixed element at each edge — the
            // dialog's colour, not the backdrop dimming the page behind it.
            isFullScreenOnPhone && "max-md:fixed max-md:inset-0",
            className
          )}
        >
          {children}
          {isFullScreenOnPhone && <EdgeStrips />}
        </div>
      </FocusScope>
    </div>
  )
}
