import clsx from "clsx"
import { useRef, type ReactNode } from "react"
import { FocusScope, useDialog } from "react-aria"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"

/**
 * A page of the office in the left column — Who's in, My bookings, Find a
 * seat — where the headline is otherwise, in its way: the page's news as a
 * headline ("6 people in."), a sentence that sums it up, then the page as
 * type, straight on the office's ground (no background: its colours follow
 * the ground's light). Not modal: the office stays in view and in use beside it (the
 * picture's centre is moved right for the column), and it stops above the
 * dock. Focus moves in when it opens and back when it closes; Escape closes
 * it.
 */
export const ColumnPage = ({
  label,
  title,
  summary,
  actions,
  isWide = false,
  onClose,
  children,
}: {
  /** The page's name ("Who's in"): its accessible name; the headline can be news. */
  label: string
  /** The headline: the page's news ("6 people in."), or its name. */
  title: ReactNode
  /** One sentence under the headline: the page in short. */
  summary?: ReactNode
  /** Beside the headline, before close (an admin's way to manage people). */
  actions?: ReactNode
  /** Room for a dashboard (Insights): wider than a list. */
  isWide?: boolean
  onClose: () => void
  children: ReactNode
}) => {
  const ref = useRef<HTMLElement>(null)
  const { dialogProps } = useDialog({ "aria-label": label }, ref)

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
          "pointer-events-auto absolute top-[84px] bottom-[148px] left-0 z-[44] ground-surface flex flex-col on-ground outline-none max-[1279px]:top-[144px]",
          isWide ? "w-[min(900px,100vw)]" : "w-[min(580px,100vw)]"
        )}
      >
        <header className="flex shrink-0 items-start gap-2 pt-5 pr-6 pb-5 pl-6">
          <div className="min-w-0 flex-1">
            <h2
              style={{ viewTransitionName: "column-title" }}
              className="text-[clamp(44px,4.6vw,64px)] leading-[0.95] font-black tracking-[-0.035em]"
            >
              {title}
            </h2>
            {summary && (
              <p className="mt-3 text-[clamp(18px,1.6vw,22px)] leading-snug font-extrabold text-muted">
                {summary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {actions}
            <DialogCloseButton onClose={onClose} />
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col pr-6 pb-6 pl-6">{children}</div>
      </section>
    </FocusScope>
  )
}
