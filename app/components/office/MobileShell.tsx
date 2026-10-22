import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CloseButton } from "@heroui/react"
import clsx from "clsx"
import { Building2, CalendarDays, MapPin, Pin, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { MemberAvatar, PANEL, nameOf, type ShellMember, type ShellOffice } from "./shell-ui"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"
import { AccountMenu } from "./AccountMenu"
import { MyBookings } from "./MyBookings"
import { MOBILE_CHROME } from "./mobile"
import { MonthCalendar } from "~/components/OfficeEditor/ui/DateStepper"
import { useEditorStore } from "~/components/OfficeEditor/store"
import { dayPhrase, deskName, useDesksOnDay } from "~/components/OfficeEditor/useBooking"
import { useSettings } from "~/components/settings/useSettings"
import { daysBetween, formatDow, formatLong, isWeekend, type Day } from "~/utils/booking"

type Tab = "office" | "bookings" | "people"

/** The top bar: switcher and account, px. */
const TOP_BAR_HEIGHT = MOBILE_CHROME.top
/** The tab bar at the very bottom, px. */
const TAB_BAR_HEIGHT = 68
/** The day dock above the tab bar (Office tab), px. */
const DAY_DOCK_HEIGHT = MOBILE_CHROME.bottom - TAB_BAR_HEIGHT
/** Bookings / People screens: between the top bar and the tab bar, with a gap, px. */
const SCREEN_INSETS = { top: TOP_BAR_HEIGHT + 8, bottom: TAB_BAR_HEIGHT + 8 }
/** A sheet's slide-out (the `sheet-down` animation in tailwind.css), ms. */
const SHEET_EXIT_MS = 140

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
 * over a tab bar: Office, Bookings, People. View and book only: no editing on
 * a phone. Sizes match MOBILE_CHROME, which the plan fits the office between.
 */
export const MobileShell = ({ offices, me, members, empty = false }: Props) => {
  const [tab, setTab] = useState<Tab>("office")

  if (empty) return <TopBar offices={offices} />

  return (
    <>
      <TopBar offices={offices} />
      {tab === "office" && <DayDock me={me} />}
      {tab === "bookings" && (
        <MyBookings
          isScreen
          style={SCREEN_INSETS}
          onClose={() => setTab("office")}
          onShow={() => setTab("office")}
        />
      )}
      {tab === "people" && <People me={me} members={members} onFind={() => setTab("office")} />}
      <TabBar tab={tab} onChange={setTab} />
    </>
  )
}

/** Where you are (office switcher) and who you are (account), edge to edge. */
const TopBar = ({ offices }: { offices: ShellOffice[] }) => (
  <header
    className="pointer-events-auto absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-chrome-border bg-chrome/95 px-3 shadow-[0_2px_10px_var(--chrome-shadow)] backdrop-blur-md"
    style={{ height: TOP_BAR_HEIGHT }}
  >
    {/* The switcher takes what the account leaves, and truncates in it. */}
    <WorkspaceSwitcher
      offices={offices}
      isCompact
      className="relative max-w-full justify-self-start"
    />
    <AccountMenu isFlat />
  </header>
)

/**
 * Day switching, where a thumb reaches: your desk for the shown day with Today
 * (always there, dimmed while today is shown — so nothing moves), then the
 * calendar and the strip of days.
 */
const DayDock = ({ me }: { me: ShellMember }) => {
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const setDay = useEditorStore((s) => s.setBookingDay)
  const spotlightSeat = useEditorStore((s) => s.spotlightSeat)
  const { byPerson } = useDesksOnDay()
  const mine = byPerson.get(me.userEmail)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <section
      aria-label="Day"
      className="pointer-events-auto absolute inset-x-0 flex flex-col gap-1.5 border-t border-chrome-border bg-chrome px-3 py-2 shadow-[0_-2px_10px_var(--chrome-shadow)]"
      style={{ bottom: TAB_BAR_HEIGHT, height: DAY_DOCK_HEIGHT }}
    >
      <div className="flex h-11 shrink-0 items-center gap-2.5">
        <MemberAvatar m={me} className="size-8 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-foreground">
            {mine ? deskName(mine.desk) : `No desk ${dayPhrase(day, today)}`}
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            {mine?.state.kind === "resident" ? (
              <>
                <Pin className="size-3" /> Your permanent desk
              </>
            ) : mine ? (
              `Yours ${dayPhrase(day, today)}`
            ) : (
              "Tap a free + on the plan to book one"
            )}
          </p>
        </div>
        {mine && (
          <button
            type="button"
            onClick={() => spotlightSeat(mine.desk.id)}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-foreground/[0.07] px-3 text-sm font-bold text-foreground"
          >
            <MapPin className="size-4" /> Show
          </button>
        )}
        <button
          type="button"
          onClick={() => setDay(today)}
          disabled={day === today}
          className="flex min-h-11 shrink-0 items-center rounded-xl px-2.5 text-sm font-extrabold text-accent transition-opacity disabled:opacity-35"
        >
          Today
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Pick a day from the calendar"
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
  const setDay = useEditorStore((s) => s.setBookingDay)
  const [isClosing, setIsClosing] = useState(false)
  const close = () => {
    setIsClosing(true)
    window.setTimeout(onClose, SHEET_EXIT_MS)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Portalled: the dock's backdrop blur would otherwise be the fixed sheet's
  // containing block, squeezing it into the dock.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close the calendar"
        className="absolute inset-0 bg-foreground/25"
        onClick={close}
      />
      <section
        role="dialog"
        aria-label="Pick a day"
        className={clsx(
          "relative flex flex-col gap-3 rounded-t-3xl border-t border-border bg-overlay px-5 pb-7 pt-2.5 shadow-overlay",
          isClosing ? "sheet-down" : "sheet-up"
        )}
      >
        <span aria-hidden className="mx-auto h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground">Pick a day</h2>
          <CloseButton aria-label="Close" onPress={close} />
        </div>
        <MonthCalendar
          className="w-full"
          onPick={(d) => {
            setDay(d)
            close()
          }}
        />
      </section>
    </div>,
    document.body
  )
}

/** The bookable days (this week through the booking window), the shown one picked. */
const DayStrip = () => {
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const from = useEditorStore((s) => s.booking.from)
  const lastDay = useEditorStore((s) => s.booking.lastDay)
  const setDay = useEditorStore((s) => s.setBookingDay)
  const days = useMemo(() => (from && lastDay ? daysBetween(from, lastDay) : []), [from, lastDay])

  // Keep the shown day in view (centred) as it changes.
  const selected = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selected.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [day])

  return (
    <nav
      aria-label="Days"
      className="flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto [scrollbar-width:none]"
    >
      {days.map((d: Day) => {
        const isSelected = d === day
        return (
          <button
            key={d}
            ref={isSelected ? selected : undefined}
            type="button"
            aria-pressed={isSelected}
            aria-label={formatLong(d) + (d === today ? ", today" : "")}
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
              {d === today ? "Today" : formatDow(d)}
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
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const spotlightSeat = useEditorStore((s) => s.spotlightSeat)
  const { open: openSettings } = useSettings()
  const { byPerson } = useDesksOnDay()
  const roster = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i, at: byPerson.get(m.userEmail) }))
        .sort((a, b) => Number(!a.at) - Number(!b.at) || a.i - b.i),
    [members, byPerson]
  )
  const inCount = roster.filter((r) => r.at).length

  return (
    <section
      aria-label="Who's in"
      className={`${PANEL} absolute inset-x-3 flex flex-col p-4`}
      style={SCREEN_INSETS}
    >
      <header className="mb-3">
        <h2 className="text-lg font-extrabold text-foreground">Who&apos;s in</h2>
        <p className="text-xs text-muted">
          {day === today ? "Today" : formatLong(day)} · {inCount} of {members.length} in the office
        </p>
      </header>
      {members.length <= 1 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-bold text-foreground">It&apos;s just you so far</p>
          <button
            type="button"
            onClick={() => openSettings("org", "invitations")}
            className="min-h-11 rounded-xl bg-accent/15 px-4 text-sm font-bold text-accent"
          >
            Invite teammates
          </button>
        </div>
      ) : (
        <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
          {roster.map(({ m, at }) => (
            <li key={m.userEmail} className="flex items-center gap-3 rounded-xl px-1 py-1.5">
              <MemberAvatar m={m} className="size-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.userEmail === me.userEmail ? "You" : nameOf(m)}
                </p>
                <p className="truncate text-xs text-muted">{at ? deskName(at.desk) : "Not in"}</p>
              </div>
              {at && (
                <button
                  type="button"
                  aria-label={`Show ${nameOf(m)}'s desk on the plan`}
                  onClick={() => {
                    spotlightSeat(at.desk.id)
                    onFind()
                  }}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-default px-3 text-sm font-bold text-foreground"
                >
                  <MapPin className="size-4" /> Find
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const TABS: [Tab, string, LucideIcon][] = [
  ["office", "Office", Building2],
  ["bookings", "Bookings", CalendarDays],
  ["people", "People", Users],
]

const TabBar = ({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) => (
  <nav
    aria-label="Main"
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
        {label}
      </button>
    ))}
  </nav>
)
