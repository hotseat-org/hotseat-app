import clsx from "clsx"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import { useParams } from "react-router"
import { SettingsFooterProvider } from "./SettingsFooter"
import { UnsavedChangesProvider, type UnsavedChanges } from "./unsavedChanges"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { useTouchSwipe } from "~/components/ui/useTouchSwipe"
import { Button } from "~/components/Button"
import { InlineModal } from "~/components/ui/InlineModal"
import { SidePage } from "~/components/ui/SidePage"
import { focusNextChoice } from "~/components/ui/rovingFocus"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
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

  const { officeSlug } = useParams()
  const isMobile = useIsMobile()

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

  // Over an office on a computer, settings open beside it (see below).
  const isBesideOffice = !!officeSlug && !isMobile

  const content = (
    <>
      {/* The menu as a column (the dialog); beside the office, it's a row of
          words under the title instead (below), the page's width for the page. */}
      {!isBesideOffice && (
        <nav
          aria-label={title}
          className={clsx(
            "hidden shrink-0 flex-col gap-5 border-r border-separator py-7 md:flex",
            // Beside the office, the page is half the screen: a slimmer menu.
            isBesideOffice ? "w-[208px] px-2" : "w-[272px] px-4"
          )}
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
      )}

      <main className={clsx("flex min-w-0 flex-1 flex-col", !isBesideOffice && "bg-overlay")}>
        <header
          className={clsx(
            "flex items-start justify-between gap-4",
            isBesideOffice ? "px-6 pt-5 pb-3" : "px-4 pb-3 pt-4 md:px-9 md:pb-5 md:pt-8"
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0">
              {/* Phones, on a section's page: back to the list, named for it. */}
              {!isListShown && (
                <button
                  type="button"
                  onClick={() => select(null)}
                  className="-ml-1.5 mb-1 flex items-center gap-0.5 text-base font-extrabold text-text hover:underline md:hidden"
                >
                  <ChevronLeft className="size-5" />
                  {t("Settings")}
                </button>
              )}
              {/* Beside the office: whose settings, small, over the title. */}
              {isBesideOffice && (
                <p className="mb-1.5 text-lg font-extrabold text-muted">
                  {identity.name} · {title}
                </p>
              )}
              {/* Phones, on the list: the settings' own title. */}
              <h1
                className={clsx(
                  "truncate font-black text-foreground",
                  isBesideOffice
                    ? "text-[clamp(44px,4.6vw,64px)] leading-[0.95] tracking-[-0.035em]"
                    : "text-xl tracking-tight md:text-[44px] md:leading-[1.05] md:tracking-[-0.03em]",
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
              {/* One line, kept even with none (a danger zone): the tabs under
                  it never move between sections. */}
              {(active.description || isBesideOffice) && (
                <p
                  className={clsx(
                    "hidden text-muted md:block",
                    isBesideOffice
                      ? "mt-2 h-7 truncate text-lg leading-7 font-bold"
                      : "mt-2 text-base font-semibold"
                  )}
                >
                  {active.description && t(active.description)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("Close settings")}
            title={t("Close (Esc)")}
            // A ring of ink, as every close (DialogCloseButton).
            className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-foreground text-foreground transition-colors hover:bg-foreground hover:text-background"
          >
            <X className="size-5" strokeWidth={2.4} />
          </button>
        </header>
        {/* Beside the office: the sections as tabs — a row on a rule, the open
            one marked by a bar of the scheme's colour on it; the others answer
            the pointer. It scrolls sideways if they don't fit. */}
        {isBesideOffice && (
          <SectionTabs
            label={title}
            links={[...main, ...danger]}
            currentId={active.id}
            onSelect={select}
          />
        )}
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
            {...(isBesideOffice && {
              id: SECTION_PANEL_ID,
              role: "tabpanel",
              "aria-labelledby": getTabId(active.id),
            })}
            frameClassName={clsx("flex-1", motion.current === "push" && "settings-push")}
            // settings-page: its fields in the headline's way (see tailwind.css).
            className={clsx(
              "settings-page flex flex-col gap-4",
              isBesideOffice ? "px-6 pb-6" : "px-4 pb-6 md:px-9 md:pb-8"
            )}
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
    </>
  )

  // Over an office on a computer: a page beside it, to the screen's middle (the
  // office moves over); elsewhere — a phone, a page without an office — a dialog.
  if (isBesideOffice)
    return (
      <SidePage label={title} onClose={close} className="flex flex-row">
        {content}
      </SidePage>
    )

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
      {content}
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
  // A section is a ruled row on the ground (the design system's Row): its
  // name, a line on what's in it, and where it leads. No cards, no icon tiles.
  const row = (link: SettingsLink) => (
    <li key={link.id}>
      <button
        type="button"
        onClick={() => onSelect(link.id)}
        className="flex min-h-[68px] w-full items-center gap-3 py-3 text-left outline-none transition-colors active:bg-state-pressed focus-visible:ring-2 focus-visible:ring-focus-ring"
      >
        <span className="min-w-0 flex-1">
          <span
            className={clsx(
              "block truncate text-lg font-extrabold",
              link.danger ? "text-text-danger" : "text-text"
            )}
          >
            {t(link.label)}
          </span>
          {link.description && (
            <span className="block truncate text-sm font-semibold text-text-muted">
              {t(link.description)}
            </span>
          )}
        </span>
        {link.count !== undefined && (
          <span className="text-sm font-extrabold tabular-nums text-text-muted">{link.count}</span>
        )}
        <ChevronRight className="size-5 shrink-0 text-text-muted" />
      </button>
    </li>
  )

  return (
    <nav
      className={clsx(
        "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-6 md:hidden",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {identity.visual}
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold text-text">{identity.name}</p>
          <p className="truncate text-sm font-semibold text-text-muted">{identity.sub}</p>
        </div>
      </div>
      <div>
        <p className="pb-1 text-sm font-extrabold text-text-muted">{groupLabel}</p>
        <ul className="divide-y divide-line-rule border-y border-line-rule">{main.map(row)}</ul>
      </div>
      {danger.length > 0 && (
        <ul className="divide-y divide-line-rule border-y border-line-rule">{danger.map(row)}</ul>
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

/** The open section's panel, named by its tab (beside the office). */
const SECTION_PANEL_ID = "settings-section"

const getTabId = (sectionId: string) => `settings-tab-${sectionId}`

/**
 * Beside the office: the sections as tabs — a row on a rule, the open one
 * marked by a bar of the scheme's colour on it; the others answer the pointer.
 * It scrolls sideways if they don't fit. A tab list: Tab enters at the open
 * one, the arrows (Home, End) move between them, Enter or Space opens one —
 * not the arrows alone, as leaving a section may first ask about its changes.
 */
const SectionTabs = ({
  label,
  links,
  currentId,
  onSelect,
}: {
  label: string
  links: SettingsLink[]
  currentId: string
  onSelect: (section: string) => void
}) => {
  const { t } = useI18n()

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={(event) => focusNextChoice(event, "tab")}
      className="mx-6 mb-5 flex shrink-0 gap-1 overflow-x-auto border-b-2 border-line-rule [scrollbar-width:none]"
    >
      {links.map((link) => {
        const isCurrent = link.id === currentId

        return (
          <button
            key={link.id}
            id={getTabId(link.id)}
            type="button"
            role="tab"
            aria-selected={isCurrent}
            aria-controls={isCurrent ? SECTION_PANEL_ID : undefined}
            tabIndex={isCurrent ? 0 : -1}
            onClick={() => onSelect(link.id)}
            className={clsx(
              "relative flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-t-xl px-3 text-base font-extrabold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring",
              getTabTone({ isCurrent, isDanger: !!link.danger })
            )}
          >
            {t(link.label)}
            {link.count !== undefined && (
              <span
                className={clsx(
                  "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-black tabular-nums",
                  isCurrent ? "bg-action-primary text-action-primary-text" : "bg-fill-subtle"
                )}
              >
                {link.count}
              </span>
            )}
            {isCurrent && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-0.5 h-1 rounded-full bg-mark-accent"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/** A section tab's colours: the open one in ink; the rest quieter, lit on hover. */
const getTabTone = ({ isCurrent, isDanger }: { isCurrent: boolean; isDanger: boolean }) => {
  if (isCurrent) return isDanger ? "text-text-danger" : "text-text"

  return isDanger
    ? "text-text-danger/80 hover:bg-state-hover hover:text-text-danger"
    : "text-text-muted hover:bg-state-hover hover:text-text"
}
