import { useEffect, useMemo, useRef, useState } from "react"
import clsx from "clsx"
import { Building2, CalendarDays, Layers, MapPin, Pin, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MemberAvatar, nameOf, type ShellMember, type ShellOffice } from "./shell-ui"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { AccountMenu } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { NotificationsBell } from "./Notifications"
import { WeekDots } from "./WeekDots"
import { MOBILE_CHROME } from "./mobile"
import { BottomSheet } from "~/components/ui/BottomSheet"
import { MapLayerSwitches, SidePanelBadge, useMapLayerRows, useSidePanels } from "~/editor"
import { useOfficeStore } from "~/office/store"
import { MonthCalendar } from "~/office/booking/DateStepper"
import {
  dayPhrase,
  deskName,
  useDesksOnDay,
  useGivenUpDesk,
  useWaitlist,
  useWeekPresence,
} from "~/office/booking/useBooking"
import { useSettings } from "~/components/settings/useSettings"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { daysBetween, isWeekend, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import { msg } from "~/i18n/msg"

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
  // The sheet over the office (Bookings, People); none, the office itself.
  const [sheet, setSheet] = useState<Exclude<Tab, "office"> | null>(null)
  const closeSheet = () => setSheet(null)

  if (empty) return <TopBar offices={offices} />

  return (
    <>
      <TopBar offices={offices} />
      <MapButtons />
      <DayDock me={me} />
      {sheet === "bookings" && (
        <BottomSheet
          title={t("My bookings")}
          isTall
          bottomInset={TAB_BAR_HEIGHT}
          onClose={closeSheet}
        >
          {(close) => <MyBookings isSheet onClose={close} onShow={close} />}
        </BottomSheet>
      )}
      {sheet === "people" && (
        <BottomSheet title={t("Who's in")} isTall bottomInset={TAB_BAR_HEIGHT} onClose={closeSheet}>
          {(close) => <People me={me} members={members} onFind={close} />}
        </BottomSheet>
      )}
      <TabBar tab={sheet ?? "office"} onChange={(tab) => setSheet(tab === "office" ? null : tab)} />
    </>
  )
}

/** Where you are (office switcher), what changed (bell) and who you are (account), edge to edge. */
export const TopBar = ({ offices }: { offices: ShellOffice[] }) => (
  <header
    className="pointer-events-auto absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1 border-b border-chrome-border bg-chrome/95 px-3 shadow-[0_2px_10px_var(--chrome-shadow)] backdrop-blur-md"
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

/**
 * Day switching, where a thumb reaches: your desk for the shown day with Today
 * (always there, dimmed while today is shown — so nothing moves), then the
 * calendar and the strip of days.
 */
const DayDock = ({ me }: { me: ShellMember }) => {
  const i18n = useI18n()
  const { t } = i18n
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const setDay = useOfficeStore((s) => s.setBookingDay)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const { byPerson } = useDesksOnDay()
  const mine = byPerson.get(me.userEmail)
  const givenUp = useGivenUpDesk(me.userEmail)
  const waitlist = useWaitlist()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <section
      aria-label={t("Day")}
      className="pointer-events-auto absolute inset-x-0 flex flex-col gap-1.5 border-t border-chrome-border bg-chrome px-3 py-2 shadow-[0_-2px_10px_var(--chrome-shadow)]"
      style={{ bottom: TAB_BAR_HEIGHT, height: DAY_DOCK_HEIGHT }}
    >
      <div className="flex h-11 shrink-0 items-center gap-2.5">
        <MemberAvatar m={me} className="size-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-foreground">
            {mine
              ? deskName(i18n, mine.desk)
              : givenUp
                ? t("Away {when}", { when: dayPhrase(i18n, day, today) })
                : t("No desk {when}", { when: dayPhrase(i18n, day, today) })}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            {mine?.state.kind === "resident" ? (
              <>
                <Pin className="size-3" /> {t("Your permanent desk")}
              </>
            ) : mine ? (
              t("Yours {when}", { when: dayPhrase(i18n, day, today) })
            ) : givenUp ? (
              t("You gave {desk} up — others can book it", { desk: deskName(i18n, givenUp) })
            ) : day < today ? (
              t("Past days can't be booked")
            ) : waitlist.isWaiting ? (
              <>
                {t("On the waitlist")} ·{" "}
                <button type="button" onClick={waitlist.leave} className="font-bold text-accent">
                  {t("Leave")}
                </button>
              </>
            ) : waitlist.canWait ? (
              <>
                {t("Office full")} ·{" "}
                <button type="button" onClick={waitlist.join} className="font-bold text-accent">
                  {t("Join the waitlist")}
                </button>
              </>
            ) : (
              t("Tap a free + on the plan to book one")
            )}
          </p>
        </div>
        {mine && (
          <button
            type="button"
            onClick={() => spotlightSeat(mine.desk.id)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-foreground/[0.07] px-3 text-sm font-bold text-foreground"
          >
            <MapPin className="size-4" /> {t("Show")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDay(today)}
          disabled={day === today}
          className="flex min-h-11 shrink-0 items-center rounded-xl px-2.5 text-sm font-extrabold text-accent transition-opacity disabled:opacity-35"
        >
          {t("Today")}
        </button>
      </div>
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
      className="pointer-events-auto absolute left-4 flex gap-1 rounded-xl border border-chrome-border bg-chrome/95 p-1 shadow-overlay backdrop-blur-md"
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
  const days = useMemo(() => (from && lastDay ? daysBetween(from, lastDay) : []), [from, lastDay])
  const { t, format } = useI18n()

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
        return (
          <button
            key={d}
            ref={isSelected ? selected : undefined}
            type="button"
            aria-pressed={isSelected}
            aria-label={format.long(d) + (d === today ? `, ${t("today")}` : "")}
            onClick={() => setDay(d)}
            className={clsx(
              "flex h-12 w-11 shrink-0 snap-center flex-col items-center justify-center gap-0.5 rounded-xl transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground"
                : clsx(
                    "bg-foreground/[0.05]",
                    d === today && "ring-1 ring-inset ring-accent/60",
                    d < today || isWeekend(d) ? "text-muted" : "text-foreground"
                  )
            )}
          >
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

/** Who's in on the shown day (people with a desk first); Find opens their desk. */
const People = ({
  me,
  members,
  onFind,
}: {
  me: ShellMember
  members: ShellMember[]
  onFind: () => void
}) => {
  const day = useOfficeStore((s) => s.booking.day)
  const today = useOfficeStore((s) => s.booking.today)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const i18n = useI18n()
  const { t } = i18n
  const { open: openSettings } = useSettings()
  const { byPerson } = useDesksOnDay()
  const week = useWeekPresence()
  const roster = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i, at: byPerson.get(m.userEmail) }))
        .sort((a, b) => Number(!a.at) - Number(!b.at) || a.i - b.i),
    [members, byPerson]
  )
  const inCount = roster.filter((r) => r.at).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="mb-3">
        <p className="text-xs text-muted">
          {day === today ? t("Today") : i18n.format.long(day)} ·{" "}
          {t("{in} of {total} in the office", { in: inCount, total: members.length })}
        </p>
      </header>
      {members.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-bold text-foreground">{t("It's just you so far")}</p>
          {/* Inviting is an admin's. */}
          {me.role === Role.ADMIN && (
            <button
              type="button"
              onClick={() => openSettings("org", "invitations")}
              className="min-h-11 rounded-xl bg-accent/15 px-4 text-sm font-bold text-accent"
            >
              {t("Invite teammates")}
            </button>
          )}
        </div>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {roster.map(({ m, at }) => (
            <li key={m.userEmail} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <MemberAvatar m={m} className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.userEmail === me.userEmail ? t("You") : nameOf(m)}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {/* Fixed width: every row's dots start at the same spot. */}
                  <span className="w-16 shrink-0 truncate">
                    {at ? deskName(i18n, at.desk) : t("Not in")}
                  </span>
                  <WeekDots email={m.userEmail} presence={week} />
                </p>
              </div>
              {at && (
                <button
                  type="button"
                  aria-label={t("Show {name}'s desk on the plan", { name: nameOf(m) })}
                  onClick={() => {
                    spotlightSeat(at.desk.id)
                    onFind()
                  }}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-default px-3 text-sm font-bold text-foreground"
                >
                  <MapPin className="size-4" /> {t("Find")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const TABS: [Tab, string, LucideIcon][] = [
  ["office", msg("Office"), Building2],
  ["bookings", msg("Bookings"), CalendarDays],
  ["people", msg("People"), Users],
]

const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => {
  const { t } = useI18n()
  return (
    <nav
      aria-label={t("Main")}
      className="pointer-events-auto absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-foreground/[0.08] bg-chrome px-2 pb-3 pt-1.5"
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
