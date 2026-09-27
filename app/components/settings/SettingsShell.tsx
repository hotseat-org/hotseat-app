import clsx from "clsx"
import type { LucideIcon } from "lucide-react"
import { X } from "lucide-react"
import type { ReactNode } from "react"
import { InlineModal } from "~/components/ui/InlineModal"

export type SettingsLink = {
  id: string
  label: string
  icon: LucideIcon
  /** One line under the panel title. */
  description?: string
  /** Shown at the end of the nav item (e.g. member count). */
  count?: number
  /** Destructive section: pinned to the bottom of the nav, in red. */
  danger?: boolean
}

type SettingsShellProps = {
  /** Accessible name of the dialog, e.g. "Organization settings". */
  title: string
  /** Who/what these settings are for: shown at the top of the nav. */
  identity: { visual: ReactNode; name: string; sub: string }
  /** Small uppercase label above the nav items. */
  groupLabel: string
  links: SettingsLink[]
  activeSection: string
  onSelect: (section: string) => void
  onClose: () => void
  children: ReactNode
}

/**
 * The settings modal: an identity header + sectioned nav on the left (danger
 * zone pinned at the bottom), the active panel on the right under its title.
 * It owns no routing — selection and close are delegated through `onSelect` /
 * `onClose` so it can be driven by search params. Panels render their content
 * as `SettingsCard`s and, for forms, a `SaveBar` that appears when dirty.
 */
export function SettingsShell({
  title,
  identity,
  groupLabel,
  links,
  activeSection,
  onSelect,
  onClose,
  children,
}: SettingsShellProps) {
  const active = links.find((l) => l.id === activeSection) ?? links[0]
  const main = links.filter((l) => !l.danger)
  const danger = links.filter((l) => l.danger)

  const item = (l: SettingsLink) => {
    const Icon = l.icon
    const isActive = l.id === active.id
    return (
      <button
        key={l.id}
        type="button"
        onClick={() => onSelect(l.id)}
        aria-current={isActive ? "page" : undefined}
        className={clsx(
          "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors",
          isActive
            ? "bg-surface font-bold text-foreground shadow-surface"
            : l.danger
              ? "font-bold text-danger hover:bg-danger/10"
              : "font-semibold text-muted hover:bg-foreground/5 hover:text-foreground"
        )}
      >
        <Icon className={clsx("size-[18px] shrink-0", isActive && !l.danger && "text-accent")} />
        <span className="min-w-0 flex-1 truncate">{l.label}</span>
        {l.count !== undefined && (
          <span className="text-xs font-bold tabular-nums text-muted">{l.count}</span>
        )}
      </button>
    )
  }

  return (
    // Rendered in place (not portalled) so a settings URL comes out of the
    // server with the modal already open.
    <InlineModal
      label={title}
      onClose={onClose}
      className="flex h-[82vh] max-h-[760px] w-[min(1080px,94vw)] flex-row gap-0 overflow-hidden rounded-[28px] border border-border bg-overlay p-0 shadow-overlay"
    >
      <nav
        aria-label={title}
        className="hidden w-[272px] shrink-0 flex-col gap-5 border-r border-separator bg-surface-secondary px-4 py-7 md:flex"
      >
        <div className="flex items-center gap-3 px-2">
          {identity.visual}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold text-foreground">{identity.name}</p>
            <p className="truncate text-xs text-muted">{identity.sub}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="px-2.5 pb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted">
            {groupLabel}
          </p>
          {main.map(item)}
        </div>
        <div className="flex-1" />
        {danger.length > 0 && <div className="flex flex-col gap-1">{danger.map(item)}</div>}
      </nav>

      <main className="flex min-w-0 flex-1 flex-col bg-overlay">
        <header className="flex items-start justify-between gap-4 px-9 pb-5 pt-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">{active.label}</h1>
            {active.description && <p className="mt-1 text-sm text-muted">{active.description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            title="Close (Esc)"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </header>
        {/* Scrolls; a panel's SaveBar sticks to the bottom of this area. */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-9 pb-8">
          {children}
        </div>
      </main>
    </InlineModal>
  )
}
