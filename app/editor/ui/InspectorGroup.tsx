import clsx from "clsx"
import { ChevronDown } from "lucide-react"
import { useId, useState, type ReactNode } from "react"

/** The groups folded away, by title: kept while switching selection (and for the session). */
const foldedGroups = new Set<string>()

/**
 * A group of the Inspector's settings under its title — folded away or open
 * with a press on it, and kept that way from one selection to the next. An
 * `action` (a link-like button) can sit at the title's end.
 */
export const InspectorGroup = ({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(() => !foldedGroups.has(title))
  const bodyId = useId()

  const toggle = () => {
    if (isOpen) foldedGroups.add(title)
    else foldedGroups.delete(title)

    setIsOpen(!isOpen)
  }

  return (
    <section className="border-b border-separator py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={toggle}
          className="-mx-1 flex min-w-0 flex-1 items-center gap-1 rounded-md px-1 py-0.5 text-left text-xs font-extrabold uppercase tracking-wide text-muted outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronDown
            className={clsx("size-3.5 shrink-0 transition-transform", !isOpen && "-rotate-90")}
          />
          <span className="truncate">{title}</span>
        </button>
        {isOpen && action}
      </div>
      {isOpen && (
        <div id={bodyId} className="mt-2 flex flex-col gap-2">
          {children}
        </div>
      )}
    </section>
  )
}
