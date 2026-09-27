import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

interface Props {
  icon: LucideIcon
  title: string
  description?: ReactNode
  /** Actions or extra content below the description. */
  children?: ReactNode
  className?: string
}

/** Centered icon-tile + title + description + optional actions. */
export const EmptyState = ({ icon: Icon, title, description, children, className }: Props) => (
  <div className={`max-w-md text-center ${className ?? ""}`}>
    <div className="mx-auto grid size-16 place-items-center rounded-[18px] border border-border bg-accent/12 text-accent">
      <Icon className="size-7" />
    </div>
    <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground">{title}</h2>
    {description && <p className="mt-1.5 text-muted">{description}</p>}
    {children && <div className="mt-6">{children}</div>}
  </div>
)
