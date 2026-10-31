import clsx from "clsx"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { ReactNode } from "react"
import { InlineModal } from "~/components/ui/InlineModal"
import { useI18n } from "~/i18n/I18nProvider"

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
  /** Unset: none picked yet — a phone lists them, a larger screen shows the first. */
  activeSection?: string
  /** Pick a section; null goes back to the list of them (a phone's). */
  onSelect: (section: string | null) => void
  onClose: () => void
  children: ReactNode
}

/**
 * The settings modal: an identity header + sectioned nav on the left (danger
 * zone pinned at the bottom), the active panel on the right under its title.
 * On a phone, the whole screen, one level at a time: the list of sections
 * (who they're for on top, the danger zone last), then a section's page with
 * a way back to the list.
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
  const { t } = useI18n()
  const active = links.find((l) => l.id === activeSection) ?? links[0]
  const main = links.filter((l) => !l.danger)
  const danger = links.filter((l) => l.danger)
  // Phones: no section picked yet shows the list of them, in its place.
  const isListShown = !activeSection

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
        <span className="min-w-0 flex-1 truncate">{t(l.label)}</span>
        {l.count !== undefined && (
          <span className="text-xs font-bold tabular-nums text-muted">{l.count}</span>
        )}
      </button>
    )
  }

  return (
    // Rendered in place (not portalled) so a settings URL comes out of the
    // server with the modal already open.
    // On a phone: the whole screen, the list of sections or one section's page.
    <InlineModal
      label={title}
      onClose={onClose}
      isFullScreenOnPhone
      className="flex h-dvh w-screen flex-row gap-0 overflow-hidden bg-overlay p-0 md:h-[82vh] md:max-h-[760px] md:w-[min(1080px,94vw)] md:rounded-[28px] md:border md:border-border md:shadow-overlay"
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
        <header className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 md:px-9 md:pb-5 md:pt-8">
          <div className="flex min-w-0 items-center gap-1">
            {/* Phones, on a section's page: back to the list of them. */}
            {!isListShown && (
              <button
                type="button"
                onClick={() => onSelect(null)}
                aria-label={t("All settings")}
                className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-secondary md:hidden"
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            <div className="min-w-0">
              {/* Phones, on the list: the settings' own title. */}
              <h1
                className={clsx(
                  "truncate text-xl font-black tracking-tight text-foreground md:text-2xl",
                  isListShown && "hidden md:block"
                )}
              >
                {t(active.label)}
              </h1>
              {isListShown && (
                <h1 className="text-xl font-black tracking-tight text-foreground md:hidden">
                  {title}
                </h1>
              )}
              {active.description && (
                <p className="mt-1 hidden text-sm text-muted md:block">{t(active.description)}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close settings")}
            title={t("Close (Esc)")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </header>
        {isListShown && (
          <SectionList identity={identity} main={main} danger={danger} onSelect={onSelect} />
        )}
        {/* Scrolls; a panel's SaveBar sticks to the bottom of this area. On a
            phone's list, the first section waits (it shows on larger screens). */}
        <div
          className={clsx(
            "min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:flex md:px-9 md:pb-8",
            isListShown ? "hidden" : "flex"
          )}
        >
          {children}
        </div>
      </main>
    </InlineModal>
  )
}

/**
 * Phones: every section, one row each — its icon, name and what it's for —
 * under who they're for; the danger zone last, apart.
 */
const SectionList = ({
  identity,
  main,
  danger,
  onSelect,
}: {
  identity: SettingsShellProps["identity"]
  main: SettingsLink[]
  danger: SettingsLink[]
  onSelect: (section: string) => void
}) => {
  const { t } = useI18n()
  const row = (link: SettingsLink) => (
    <li key={link.id}>
      <button
        type="button"
        onClick={() => onSelect(link.id)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-foreground/5"
      >
        <span
          className={clsx(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            link.danger ? "bg-danger/10 text-danger" : "bg-accent/12 text-accent"
          )}
        >
          <link.icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              "block truncate text-[15px] font-bold",
              link.danger ? "text-danger" : "text-foreground"
            )}
          >
            {t(link.label)}
          </span>
          {link.description && (
            <span className="block truncate text-xs text-muted">{t(link.description)}</span>
          )}
        </span>
        {link.count !== undefined && (
          <span className="text-xs font-bold tabular-nums text-muted">{link.count}</span>
        )}
        <ChevronRight className="size-[18px] shrink-0 text-muted" />
      </button>
    </li>
  )

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:hidden">
      <div className="flex items-center gap-3 px-1">
        {identity.visual}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-foreground">{identity.name}</p>
          <p className="truncate text-xs text-muted">{identity.sub}</p>
        </div>
      </div>
      <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface shadow-surface">
        {main.map(row)}
      </ul>
      {danger.length > 0 && (
        <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface shadow-surface">
          {danger.map(row)}
        </ul>
      )}
    </nav>
  )
}
