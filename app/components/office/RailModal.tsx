import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { DialogCloseButton } from "~/components/ui/DialogCloseButton"
import { InlineModal } from "~/components/ui/InlineModal"

/**
 * A modal opened from the office's rail (see useOfficePanel): its title, any
 * actions beside it, close, and what it holds — at a fixed height, scrolling
 * inside, so it never jumps as its list loads. Escape and the dimmed page
 * behind close it too. Portalled to the page (the office's shell is
 * client-only, so nothing's lost on the server): over the rail and the map,
 * whatever layer opened it.
 */
export const RailModal = ({
  title,
  actions,
  onClose,
  children,
}: {
  title: string
  /** Beside the title, before close (an admin's way to manage people). */
  actions?: ReactNode
  onClose: () => void
  children: ReactNode
}) =>
  createPortal(
    <InlineModal
      label={title}
      onClose={onClose}
      className="flex h-[min(680px,86vh)] w-[min(460px,94vw)] flex-col rounded-[calc(var(--radius)*3)] border border-border bg-overlay p-5 text-foreground shadow-overlay"
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">{title}</h2>
        <div className="flex items-center gap-1">
          {actions}
          <DialogCloseButton onClose={onClose} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </InlineModal>,
    document.body
  )
