import clsx from "clsx"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { SettingsFooterProvider } from "./SettingsFooter"
import { UnsavedChangesProvider, type UnsavedChanges } from "./unsavedChanges"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { useTouchSwipe } from "~/components/ui/useTouchSwipe"
import { Button } from "~/components/Button"
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

/** A swipe back starts this close to the left edge (px)… */
const BACK_EDGE = 28
/** …and goes back past this far (px), or on a flick (px per ms). */
const BACK_DISTANCE = 90
const BACK_FLICK_SPEED = 0.5

type SettingsShellProps = {
  /** Accessible name of the dialog, e.g. "Organization settings". */
  title: string
  /** Who/what these settings are for: shown at the top of the nav. */
  identity: { visual: ReactNode; name: string; sub: string }
  /** A small label above the nav items, in sentence case. */
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
 * a way back to the list — which slides in, and swipes back from the left
 * edge, as on an iPhone. Leaving a panel with unsaved changes (closing, going
 * back, another section) asks first.
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

  // The open panel's unsaved changes (its SaveBar reports them): leaving asks first.
  const unsavedChanges = useRef<UnsavedChanges | null>(null)
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)
  const leave = (action: () => void) =>
    unsavedChanges.current?.isDirty ? setPendingLeave(() => action) : action()
  const close = () => leave(onClose)
  const select = (section: string | null) => {
    if (section !== (activeSection ?? null)) leave(() => onSelect(section))
  }

  // Phones: a page slides in from the right, the list back from the left.
  const shownSection = useRef(activeSection)
  const motion = useRef<"push" | "pop" | null>(null)
  if (shownSection.current !== activeSection) {
    motion.current = activeSection ? "push" : "pop"
    shownSection.current = activeSection
  }

  // Phones, on a page: a swipe from the left edge goes back to the list.
  const swipeBack = useTouchSwipe({
    axis: "x",
    canStart: (x) => x <= BACK_EDGE,
    onRelease: (distance, speed) => {
      if (distance > BACK_DISTANCE || speed > BACK_FLICK_SPEED) select(null)
    },
  })

  // A section is a word, as the office's top bar: the one you're on in ink,
  // underlined; the rest quieter (no icons, no tile).
  const item = (link: SettingsLink) => {
    const isActive = link.id === active.id
    return (
      <button
        key={link.id}
        type="button"
        onClick={() => select(link.id)}
        aria-current={isActive ? "page" : undefined}
        className={clsx(
          "flex min-h-11 items-center gap-2.5 rounded-xl px-2.5 text-left text-lg font-extrabold tracking-[-0.01em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
          isActive && "text-foreground underline decoration-[3px] underline-offset-[7px]",
          !isActive &&
            (link.danger ? "text-danger hover:bg-danger/10" : "text-muted hover:text-foreground")
        )}
      >
        <span className="min-w-0 flex-1 truncate">{t(link.label)}</span>
        {link.count !== undefined && (
          <span className="text-sm font-bold tabular-nums text-muted no-underline">
            {link.count}
          </span>
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
      onClose={close}
      isFullScreenOnPhone
      className="flex h-dvh w-screen flex-row gap-0 overflow-hidden bg-overlay p-0 md:h-[82vh] md:max-h-[760px] md:w-[min(1080px,94vw)] md:on-ground"
    >
      <nav
        aria-label={title}
        className="hidden w-[272px] shrink-0 flex-col gap-5 border-r border-separator px-4 py-7 md:flex"
      >
        <div className="flex items-center gap-3 px-2">
          {identity.visual}
          <div className="min-w-0">
            <p className="truncate text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
              {identity.name}
            </p>
            <p className="truncate text-sm font-semibold text-muted">{identity.sub}</p>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1.5 text-[13px] font-black text-muted">{groupLabel}</p>
          {main.map(item)}
        </div>
        <div className="flex-1" />
        {danger.length > 0 && <div className="flex flex-col gap-0.5">{danger.map(item)}</div>}
      </nav>

      <main className="flex min-w-0 flex-1 flex-col bg-overlay">
        <header className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 md:px-9 md:pb-5 md:pt-8">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0">
              {/* Phones, on a section's page: back to the list, named for it. */}
              {!isListShown && (
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="-ml-1.5 mb-1 flex items-center gap-0.5 text-[15px] font-semibold text-accent md:hidden"
                >
                  <ChevronLeft className="size-5" />
                  {t("Settings")}
                </button>
              )}
              {/* Phones, on the list: the settings' own title. */}
              <h1
                className={clsx(
                  "truncate text-xl font-black tracking-tight text-foreground md:text-[44px] md:leading-[1.05] md:tracking-[-0.03em]",
                  isListShown && "hidden md:block"
                )}
              >
                {t(active.label)}
              </h1>
              {/* Phones, on the list: the settings' own title, large. */}
              {isListShown && (
                <h1 className="text-[28px] font-black leading-tight tracking-tight text-foreground md:hidden">
                  {title}
                </h1>
              )}
              {active.description && (
                <p className="mt-2 hidden text-base font-semibold text-muted md:block">
                  {t(active.description)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("Close settings")}
            title={t("Close (Esc)")}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <X className="size-[18px]" />
          </button>
        </header>
        {isListShown && (
          <SectionList
            key="list"
            identity={identity}
            groupLabel={groupLabel}
            main={main}
            danger={danger}
            onSelect={select}
            className={clsx(motion.current === "pop" && "settings-pop")}
          />
        )}
        {/* Scrolls; a panel's SaveBar sticks to the bottom of this area. On a
            phone's list, the first section waits (it shows on larger screens).
            On a phone's page, it follows a swipe back from the left edge. */}
        <div
          {...(isListShown ? {} : swipeBack.handlers)}
          className={clsx(
            "min-h-0 flex-1 touch-pan-y flex-col md:flex",
            isListShown ? "hidden" : "flex"
          )}
          style={{
            transform: swipeBack.offset > 0 ? `translateX(${swipeBack.offset}px)` : undefined,
            transition: swipeBack.offset > 0 ? "none" : "transform 200ms ease-out",
          }}
        >
          <ScrollArea
            key={activeSection ?? "first"}
            frameClassName={clsx("flex-1", motion.current === "push" && "settings-push")}
            // settings-page: its fields in the headline's way (see tailwind.css).
            className="settings-page flex flex-col gap-4 px-4 pb-6 md:px-9 md:pb-8"
          >
            <UnsavedChangesProvider value={unsavedChanges}>
              <SettingsFooterProvider value={footerSlot}>{children}</SettingsFooterProvider>
            </UnsavedChangesProvider>
          </ScrollArea>
          {/* The panel's actions (see SettingsFooter): under the content, always in view. */}
          <div ref={setFooterSlot} className="shrink-0 empty:hidden" />
        </div>
        {pendingLeave && (
          <DiscardChanges
            onKeep={() => setPendingLeave(null)}
            onDiscard={() => {
              unsavedChanges.current?.discard()
              setPendingLeave(null)
              pendingLeave()
            }}
          />
        )}
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
  groupLabel,
  main,
  danger,
  onSelect,
  className,
}: {
  identity: SettingsShellProps["identity"]
  groupLabel: string
  main: SettingsLink[]
  danger: SettingsLink[]
  onSelect: (section: string) => void
  className?: string
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
    <nav
      className={clsx(
        "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6 md:hidden",
        className
      )}
    >
      <div className="flex items-center gap-3 px-1">
        {identity.visual}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-foreground">{identity.name}</p>
          <p className="truncate text-xs text-muted">{identity.sub}</p>
        </div>
      </div>
      <div>
        <p className="px-4 pb-1.5 text-[13px] font-black text-muted">{groupLabel}</p>
        <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface shadow-surface">
          {main.map(row)}
        </ul>
      </div>
      {danger.length > 0 && (
        <ul className="divide-y divide-separator overflow-hidden rounded-2xl bg-surface shadow-surface">
          {danger.map(row)}
        </ul>
      )}
    </nav>
  )
}

/** Leaving a panel with unsaved changes: keep editing, or throw them away and go. */
const DiscardChanges = ({ onKeep, onDiscard }: { onKeep: () => void; onDiscard: () => void }) => {
  const { t } = useI18n()

  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-scrim p-6">
      <div
        role="alertdialog"
        aria-label={t("Discard changes?")}
        className="w-full max-w-xs rounded-2xl border border-border bg-overlay p-5 text-center shadow-overlay"
      >
        <p className="text-base font-extrabold text-foreground">{t("Discard changes?")}</p>
        <p className="mt-1 text-sm text-muted">{t("What you changed on this page isn't saved.")}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="danger" onPress={onDiscard}>
            {t("Discard")}
          </Button>
          <Button variant="ghost" onPress={onKeep}>
            {t("Keep editing")}
          </Button>
        </div>
      </div>
    </div>
  )
}
