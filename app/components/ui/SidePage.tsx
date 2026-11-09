import clsx from "clsx"
import { useRef, type ReactNode } from "react"
import { FocusScope, useDialog } from "react-aria"
import { useIsPageSwitch } from "./pageSwitch"

/**
 * A page from the screen's left edge to its middle, as the office's other
 * pages but wider: for the heavier things — settings, Insights — that would
 * otherwise be full-screen dialogs. Not modal: the office stays as it is, in
 * view and in use. Focus moves in when it opens and back when it closes;
 * Escape closes it. Its sheet is the office shell's (see .column-sheet).
 */
export const SidePage = ({
  label,
  onClose,
  className,
  children,
}: {
  /** Its accessible name. */
  label: string
  onClose: () => void
  /** Its inside's layout (a row of a menu and a page, a column…). */
  className?: string
  children: ReactNode
}) => {
  const ref = useRef<HTMLElement>(null)
  const isSwitch = useIsPageSwitch()
  const { dialogProps } = useDialog({ "aria-label": label }, ref)

  return (
    // No autoFocus: useDialog focuses the page itself, so opening it doesn't
    // paint a focus ring on its first button; Tab goes there next.
    <FocusScope restoreFocus>
      <section
        {...dialogProps}
        ref={ref}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation()
            onClose()
          }
        }}
        className={clsx(
          // Over the top menu, from the screen's top; in place of another page,
          // only its content fades in (the panel stays).
          isSwitch ? "motion-content-in" : "motion-page-in",
          "on-ground pointer-events-auto fixed inset-y-0 left-0 z-50 w-(--wide-page) pt-3 outline-none",
          className
        )}
      >
        {children}
      </section>
    </FocusScope>
  )
}
