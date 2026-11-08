import { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { Armchair, Building2, CalendarDays, Hourglass, Layers, MapPin, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { type ShellMember, type ShellOffice } from "./shell-ui"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { AccountMenu } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { NotificationsBell } from "./Notifications"
import { PersonProfile } from "./PersonProfile"
import { WhosInList } from "./WhosIn"
import { MOBILE_CHROME } from "./mobile"
import { TeamDayCard } from "./TeamDayCard"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { MapLayerSwitches, SidePanelBadge, useMapLayerRows, useSidePanels } from "~/editor"
import { useOfficeStore } from "~/office/store"
import { MonthCalendar } from "~/office/booking/DateStepper"
import { useDesksOnDay, useGivenUpDesk, useWaitlist } from "~/office/booking/useBooking"
import { daysBetween, isOpenDay, isWeekend, type Day } from "~/utils/booking"
import { getTeamHex } from "~/utils/teams"
import { useTeamDays } from "~/office/teams"
import { FindSeat } from "~/office/findSeat/FindSeat"
import { useShowSeatOnMap } from "~/office/findSeat/useFindSeat"
import { useOfficePanel } from "~/office/useOfficePanel"
import { useHeadline } from "~/office/headline/useHeadline"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"
import { useBarColor } from "~/utils/pageColor"

type Tab = "office" | "bookings" | "people"

/** The top bar: switcher and account, px. */
const TOP_BAR_HEIGHT = MOBILE_CHROME.top
/** The tab bar at the very bottom, px. */
const TAB_BAR_HEIGHT = 68
/** The day dock above the tab bar (Office tab), px. */
const DAY_DOCK_HEIGHT = MOBILE_CHROME.bottom - TAB_BAR_HEIGHT

interface Props {
  offices: ShellOffice[]
  me: ShellMember
  members: ShellMember[]
  /** Office has no layout yet: only the top bar (the first-run card is the page). */
  empty?: boolean
}

/**
 * The office on a phone: the plan full-screen between a slim top bar (office
 * switcher, account) and, at the bottom where a thumb reaches, the day dock —
 * your desk for the shown day, Today, the calendar and the strip of days —
 * over a tab bar: Office, and Bookings and People, which open as sheets over
 * the office, above the tab bar (it stays, to switch). View and book only: no editing on a phone. Sizes match MOBILE_CHROME,
 * which the plan fits the office between.
 */
export const MobileShell = ({ offices, me, members, empty = false }: Props) => {
  const { t } = useI18n()
  // The sheet over the office — Bookings, People, finding a seat — by its
  // address (see useOfficePanel); none, the office itself.
  const officePanel = useOfficePanel()
  const sheet = officePanel.panel
  const showSeatOnMap = useShowSeatOnMap()

  if (empty) return <TopBar offices={offices} />

  return (
    <>
      <TopBar offices={offices} />
      <MapButtons />
      <DayDock me={me} members={members} onFindSeat={() => officePanel.open("find")} />
      {/* Over the plan, just above the dock: closed, it gives the plan back. */}
      {!sheet && (
        <div
          className="pointer-events-none absolute inset-x-3"
          style={{ bottom: MOBILE_CHROME.bottom + 8 }}
        >
          <TeamDayCard
            me={me}
            members={members}
            onFindSeat={() => officePanel.open("find")}
            className=""
          />
        </div>
      )}
      {sheet === "bookings" && (
        // The sheet's title is the news ("5 days ahead."), as on a computer.
        <MyBookings
          isPhone
          onShow={officePanel.close}
          onFindSeat={() => officePanel.open("find")}
          frame={({ title, summary, body }) => (
            <BottomSheet
              title={String(title)}
              label={t("My bookings")}
              isTall
              bottomInset={TAB_BAR_HEIGHT}
              onClose={officePanel.close}
            >
              {() => (
                <>
                  {summary && (
                    <p className="-mt-1 mb-3 text-base font-bold text-muted">{summary}</p>
                  )}
                  {body}
                </>
              )}
            </BottomSheet>
          )}
        />
      )}
      {sheet === "people" && (
        <BottomSheet
          title={t("Who's in")}
          isTall
          bottomInset={TAB_BAR_HEIGHT}
          onClose={officePanel.close}
        >
          {(close) => <WhosInList me={me} members={members} onFind={close} />}
        </BottomSheet>
      )}
      <PersonProfile me={me} members={members} />
      {sheet === "find" && (
        <BottomSheet
          title={t("Find a seat")}
          isTall
          bottomInset={TAB_BAR_HEIGHT}
          onClose={officePanel.close}
        >
          {(close) => (
            <FindSeat
              onShowOnMap={(deskId, day) => {
                showSeatOnMap(deskId, day)
                close()
              }}
            />
          )}
        </BottomSheet>
      )}
      <TabBar
        tab={sheet === "bookings" || sheet === "people" ? sheet : "office"}
        onChange={(tab) => (tab === "office" ? officePanel.close() : officePanel.open(tab))}
      />
    </>
  )
}

/** Where you are (office switcher), what changed (bell) and who you are (account), edge to edge. */
// The top bar and the tab bar are fixed and opaque: Safari tints its status bar
// and toolbar from a fixed element at the screen's edge — these, not the
// office layer behind them.
export const TopBar = ({ offices }: { offices: ShellOffice[] }) => (
  <header
    className="pointer-events-auto fixed inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 border-b border-chrome-border bg-chrome px-3 shadow-[0_2px_10px_var(--chrome-shadow)]"
    style={{ height: TOP_BAR_HEIGHT }}
  >
    {/* The switcher takes what the account leaves, and truncates in it. */}
    <WorkspaceSwitcher
      offices={offices}
      isCompact
      className="relative max-w-full justify-self-start"
    />
    <NotificationsBell triggerClassName="grid size-11 place-items-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus" />
    <AccountMenu isFlat />
  </header>
)

/** The dock's main action (finding a seat, the waitlist), and a quieter one (showing your desk). */
const DOCK_BUTTON =
  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-black text-background"
const DOCK_BUTTON_QUIET =
  "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-foreground/[0.07] px-4 text-sm font-extrabold text-foreground"

/**
 * Day switching, where a thumb reaches: the shown day in a sentence (your
 * desk, what's free, who's in) with what to do about it, then the calendar and
 * the strip of days.
 */
const DayDock = ({
  me,
  members,
  onFindSeat,
}: {
  me: ShellMember
  members: ShellMember[]
  onFindSeat: () => void
}) => {
  const i18n = useI18n()
  const { t } = i18n
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const { byPerson } = useDesksOnDay()
  const mine = byPerson.get(me.userEmail)
  const givenUp = useGivenUpDesk(me.userEmail)
  const waitlist = useWaitlist()
  const headline = useHeadline(me, members)
  const [yours, ...office] = headline?.sentences ?? []
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <section
      aria-label={t("Day")}
      className="pointer-events-auto absolute inset-x-0 flex flex-col gap-2 border-t border-chrome-border bg-chrome px-3 py-2 shadow-[0_-2px_10px_var(--chrome-shadow)]"
      style={{ bottom: TAB_BAR_HEIGHT, height: DAY_DOCK_HEIGHT }}
    >
      {/* The day as a headline (board H9): its title large, its main action beside it. */}
      <div className="flex h-11 shrink-0 items-center gap-2.5">
        {headline && (
          <h2
            key={headline.title}
            className="motion-rise min-w-0 flex-1 truncate text-[32px] leading-none font-black tracking-[-0.03em] text-foreground"
          >
            {headline.title}
          </h2>
        )}
        {waitlist.isWaiting && (
          <button type="button" onClick={waitlist.leave} className={DOCK_BUTTON_QUIET}>
            {t("Leave")}
          </button>
        )}
        {waitlist.canWait && (
          <button type="button" onClick={waitlist.join} className={DOCK_BUTTON}>
            <Hourglass className="size-4" /> {t("Join the waitlist")}
          </button>
        )}
        {!mine && !givenUp && !waitlist.isWaiting && !waitlist.canWait && day >= today && (
          <button type="button" onClick={onFindSeat} className={DOCK_BUTTON}>
            <Armchair className="size-4" /> {t("Find a seat")}
          </button>
        )}
        {mine && (
          <button
            type="button"
            onClick={() => spotlightSeat(mine.desk.id)}
            className={DOCK_BUTTON_QUIET}
          >
            <MapPin className="size-4" /> {t("Show")}
          </button>
        )}
      </div>
      {/* The sentence: two lines at most, so the dock never grows. */}
      <p
        aria-live="polite"
        className="line-clamp-2 h-10 shrink-0 text-[15px] leading-tight font-bold text-foreground"
      >
        {headline && (
          <span key={headline.sentences.join(" ")} className="motion-rise block">
            {yours} <span className="text-muted">{office.join(" ")}</span>
          </span>
        )}
      </p>
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          aria-label={t("Pick a day from the calendar")}
          aria-expanded={isCalendarOpen}
          onClick={() => setIsCalendarOpen(true)}
          className="grid h-12 w-11 shrink-0 place-items-center rounded-xl bg-foreground/[0.07] text-foreground"
        >
          <CalendarDays className="size-5" />
        </button>
        <DayStrip />
      </div>
      {isCalendarOpen && <CalendarSheet onClose={() => setIsCalendarOpen(false)} />}
    </section>
  )
}

/** The month calendar (as on the desktop) as a bottom sheet; picking a day closes it. */
const CalendarSheet = ({ onClose }: { onClose: () => void }) => {
  const setDay = useOfficeStore((s) => s.setBookingDay)
  const { t } = useI18n()

  return (
    <BottomSheet title={t("Pick a day")} onClose={onClose}>
      {(close) => (
        <MonthCalendar
          className="w-full"
          onPick={(picked) => {
            setDay(picked)
            close()
          }}
        />
      )}
    </BottomSheet>
  )
}

/**
 * The map's own buttons, bottom-left above the dock — the side panels (the
 * desk filter, the notes) and the Map menu — mirroring turn and fit on the
 * right (see PhoneControls), so the dock is only about the day.
 */
const MapButtons = () => {
  const { t } = useI18n()
  const { entries, openPanel, toggle, close } = useSidePanels(false)
  // A phone always shows the plan: no 3D-only rows.
  const { changedCount } = useMapLayerRows({ is3d: false })
  const [isMapOpen, setIsMapOpen] = useState(false)

  return (
    <div
      className="pointer-events-auto absolute left-4 flex gap-1 rounded-xl border border-chrome-border bg-chrome/95 p-1 shadow-overlay"
      // Level with turn and fit (PhoneControls), just above the dock.
      style={{ bottom: MOBILE_CHROME.bottom + 12 }}
    >
      {entries.map(({ panel, badgeCount }) => {
        const Icon = panel.icon

        return (
          <button
            key={panel.id}
            type="button"
            aria-label={t(panel.label)}
            aria-expanded={openPanel?.id === panel.id}
            onClick={() => toggle(panel.id)}
            className={clsx(
              "relative grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
              badgeCount > 0 ? "bg-accent/15 text-accent" : "text-foreground hover:bg-foreground/10"
            )}
          >
            <Icon className="size-4" />
            {badgeCount > 0 && (
              <span className="absolute left-5 top-0">
                <SidePanelBadge count={badgeCount} />
              </span>
            )}
          </button>
        )
      })}
      <button
        type="button"
        aria-label={t("Show on the map")}
        aria-expanded={isMapOpen}
        onClick={() => setIsMapOpen(true)}
        className={clsx(
          "relative grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
          changedCount > 0 ? "bg-accent/15 text-accent" : "text-foreground hover:bg-foreground/10"
        )}
      >
        <Layers className="size-4" />
        {changedCount > 0 && (
          <span className="absolute left-5 top-0">
            <SidePanelBadge count={changedCount} />
          </span>
        )}
      </button>
      {isMapOpen && (
        <BottomSheet title={t("Show on the map")} onClose={() => setIsMapOpen(false)}>
          {() => <MapLayerSwitches is3d={false} />}
        </BottomSheet>
      )}
      {openPanel && (
        <BottomSheet title={t(openPanel.label)} onClose={close}>
          {(closeSheet) => <openPanel.Component isEditing={false} close={closeSheet} />}
        </BottomSheet>
      )}
    </div>
  )
}

/** The bookable days (this week through the booking window), the shown one picked. */
const DayStrip = () => {
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const from = useOfficeStore((s) => s.booking.from)
  const lastDay = useOfficeStore((s) => s.booking.lastDay)
  const setDay = useOfficeStore((s) => s.setBookingDay)
  const opening = useOfficeStore((s) => s.booking.opening)
  const days = useMemo(() => (from && lastDay ? daysBetween(from, lastDay) : []), [from, lastDay])
  const { t, format } = useI18n()
  const getTeamsIn = useTeamDays()

  // Keep the shown day in view (centred) as it changes.
  const selected = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selected.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [day])

  return (
    <nav
      aria-label={t("Days")}
      // Fade the ends, so a day scrolled half out reads as "more this way",
      // not as cut off.
      className="flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)] [scrollbar-width:none]"
    >
      {days.map((d: Day) => {
        const isSelected = d === day
        const isClosed = !isOpenDay(d, opening)
        // A day your team comes in together: its colour in the corner.
        const team = isClosed ? undefined : getTeamsIn(d)[0]
        const getLabel = () => {
          const label = format.long(d) + (d === today ? `, ${t("today")}` : "")
          if (isClosed) return `${label} · ${opening.closedDays[d] || t("Closed")}`

          return team ? `${label} · ${t("{team}'s days", { team: team.name })}` : label
        }

        return (
          <button
            key={d}
            ref={isSelected ? selected : undefined}
            type="button"
            aria-pressed={isSelected}
            aria-label={getLabel()}
            onClick={() => setDay(d)}
            className={clsx(
              "relative flex h-12 w-11 shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground"
                : clsx(
                    "bg-foreground/[0.05]",
                    d === today && "ring-1 ring-inset ring-accent/60",
                    d < today || isWeekend(d) || isClosed ? "text-muted" : "text-foreground"
                  ),
              isClosed && "line-through decoration-2"
            )}
          >
            {team && (
              <span
                aria-hidden
                className="absolute right-1 top-1 size-1.5 rounded-full"
                style={{ background: getTeamHex(team.color) }}
              />
            )}
            <span className="text-[0.62rem] font-bold uppercase tracking-wide">
              {d === today ? t("Today") : format.dow(d)}
            </span>
            <span className="text-base font-extrabold leading-none">{Number(d.slice(8, 10))}</span>
          </button>
        )
      })}
    </nav>
  )
}

const TABS: [Tab, string, LucideIcon][] = [
  ["office", msg("Office"), Building2],
  ["bookings", msg("Bookings"), CalendarDays],
  ["people", msg("People"), Users],
]

const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const { t } = useI18n()
  const bar = useRef<HTMLElement>(null)
  // The bars run on into the phone's status bar and toolbar: the page's edge
  // colour is theirs (tailwind.css), and so is the theme-color tags'.
  useBarColor(bar)
  useEffect(() => {
    const html = document.documentElement
    html.dataset.chromeEdges = ""

    return () => {
      delete html.dataset.chromeEdges
    }
  }, [])

  return (
    <nav
      ref={bar}
      aria-label={t("Main")}
      className="pointer-events-auto fixed inset-x-0 bottom-0 grid grid-cols-3 border-t border-foreground/[0.08] bg-chrome px-2 pb-3 pt-1.5"
      style={{ height: TAB_BAR_HEIGHT }}
    >
      {TABS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          aria-current={tab === id ? "page" : undefined}
          onClick={() => onChange(id)}
          className={clsx(
            "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[0.7rem]",
            tab === id ? "font-extrabold text-accent" : "font-bold text-muted"
          )}
        >
          <Icon className="size-6" strokeWidth={tab === id ? 2.2 : 1.8} />
          {t(label)}
        </button>
      ))}
    </nav>
  )
}
