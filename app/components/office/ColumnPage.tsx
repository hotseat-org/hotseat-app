import clsx from "clsx"
import { useRef, type ReactNode } from "react"
import { FocusScope, useDialog } from "react-aria"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"

/**
 * A page of the office in the left column — Who's in, My bookings, Find a
 * seat, Insights — where the headline is otherwise: a big title, a sentence
 * that sums it up, then the page. Not modal: the office stays in view and in
 * use beside it (the picture's centre is moved right for the column), and it
 * stops above the dock and the camera's tools. Focus
 * moves in when it opens and back when it closes; Escape closes it.
 */
export const ColumnPage = ({
  title,
  summary,
  actions,
  isWide = false,
  onClose,
  children,
}: {
  title: string
  /** One sentence under the title: the page in short. */
  summary?: ReactNode
  /** Beside the title, before close (an admin's way to manage people). */
  actions?: ReactNode
  /** Room for a dashboard (Insights): wider than a list. */
  isWide?: boolean
  onClose: () => void
  children: ReactNode
}) => {
  const ref = useRef<HTMLElement>(null)
  const { dialogProps, titleProps } = useDialog({}, ref)

  return (
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
        // Named for the move between pages and the headline (see "Motion" in tailwind.css).
        style={{ viewTransitionName: "column" }}
        className={clsx(
          "pointer-events-auto absolute top-[84px] bottom-[148px] left-5 max-[1279px]:top-[144px] z-[44] flex flex-col rounded-[calc(var(--radius)*4)] border border-border bg-overlay text-foreground shadow-overlay outline-none",
          isWide ? "w-[min(860px,calc(100vw-40px))]" : "w-[min(500px,calc(100vw-40px))]"
        )}
      >
        <header className="flex shrink-0 items-start gap-2 px-7 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <h2
              {...titleProps}
              style={{ viewTransitionName: "column-title" }}
              className="text-[44px] leading-[0.95] font-black tracking-[-0.03em]"
            >
              {title}
            </h2>
            {summary && (
              <p className="mt-2.5 text-lg leading-snug font-bold text-muted">{summary}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <DialogCloseButton onClose={onClose} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col px-7 pb-6">{children}</div>
      </section>
    </FocusScope>
  )
}
