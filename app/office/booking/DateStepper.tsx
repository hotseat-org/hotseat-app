import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { isSeatable } from "../catalog"
import { useOfficeStore } from "../store"
import { useMyTeams, useTeamDays } from "../teams"
import { isOpenDay, addDays, weekStart, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import { useAllPieces } from "~/editor"
import { getTeamHex } from "~/utils/teams"

/** The day's arrows: rings of ink, as the headline's (no fill). */
const ARROW = "rounded-full border-2 border-foreground/70 text-foreground"

/**
 * The day being shown in the office: ‹ Wed 23 Sep › in the bottom bar, with a
 * month calendar (how full each day is, and your days) behind the date. Days
 * outside the loaded range (before this week, after the booking window) are
 * disabled. Fixed widths throughout, so nothing shifts as the date changes.
 */
export const DateStepper = () => {
  const { t, format } = useI18n()
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const from = useOfficeStore((state) => state.booking.from)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const setDay = useOfficeStore((state) => state.setBookingDay)
  const [open, setOpen] = useState(false)

  const step = (offset: number) => {
    const next = addDays(day, offset)
    if (next >= from && next <= lastDay) setDay(next)
  }

  return (
    // The day as type between two round arrows (the headline's day), no tile.
    <div className="flex items-center gap-1">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className={ARROW}
        aria-label={t("Previous day")}
        isDisabled={day <= from}
        onPress={() => step(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Popover isOpen={open} onOpenChange={setOpen}>
        {/* The trigger is itself the (focusable, pressable) button. */}
        <Popover.Trigger
          aria-label={t("Showing {day}. Pick another day", { day: { day } })}
          className="flex h-9 w-48 cursor-pointer items-center justify-center gap-2 rounded-full text-base font-black tracking-[-0.01em] tabular-nums text-foreground outline-none transition-colors hover:bg-surface-tertiary focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CalendarDays className="size-4 text-accent" />
          {format.long(day)}
          {day === today && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-black text-background">
              {t("Today")}
            </span>
          )}
        </Popover.Trigger>
        <Popover.Content placement="top" offset={14} className="rounded-2xl">
          <Popover.Dialog aria-label={t("Pick a day")} className="p-4 outline-none">
            <MonthCalendar
              onPick={(pickedDay) => {
                setDay(pickedDay)
                setOpen(false)
              }}
            />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        className={ARROW}
        aria-label={t("Next day")}
        isDisabled={day >= lastDay}
        onPress={() => step(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

/** The headline's day buttons: rings of ink, a touch target each. */
const RING =
  "grid size-11 cursor-pointer place-items-center rounded-full border-2 border-foreground text-foreground outline-none transition-colors hover:bg-foreground hover:text-background focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"

/**
 * The shown day's controls beside the headline's day ("Monday." ‹ › ▦): the
 * day before, the day after, and a month calendar to pick any day.
 */
export const DayRings = () => {
  const { t } = useI18n()
  const day = useOfficeStore((state) => state.booking.day)
  const from = useOfficeStore((state) => state.booking.from)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const setDay = useOfficeStore((state) => state.setBookingDay)
  const [isOpen, setIsOpen] = useState(false)

  const step = (offset: number) => {
    const next = addDays(day, offset)
    if (next >= from && next <= lastDay) setDay(next)
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={t("Previous day")}
        disabled={day <= from}
        onClick={() => step(-1)}
        className={RING}
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        aria-label={t("Next day")}
        disabled={day >= lastDay}
        onClick={() => step(1)}
        className={RING}
      >
        <ChevronRight className="size-5" strokeWidth={2.4} />
      </button>
      <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger aria-label={t("Pick a day")} className={RING}>
          <CalendarDays className="size-5" strokeWidth={2.2} />
        </Popover.Trigger>
        <Popover.Content placement="bottom start" offset={10} className="rounded-2xl">
          <Popover.Dialog aria-label={t("Pick a day")} className="p-4 outline-none">
            <MonthCalendar
              onPick={(pickedDay) => {
                setDay(pickedDay)
                setIsOpen(false)
              }}
            />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </span>
  )
}

/** First day of the day's month. */
const monthOf = (day: Day) => `${day.slice(0, 8)}01`
const shiftMonth = (month: Day, offset: number) => {
  const [year, monthNumber] = month.split("-").map(Number)
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + offset, 1))

  return shifted.toISOString().slice(0, 10)
}

const getDayTone = (isSelected: boolean, isEnabled: boolean) => {
  if (isSelected) return "bg-accent text-accent-foreground"

  return isEnabled ? "text-foreground hover:bg-surface-secondary" : "text-muted opacity-40"
}

const getFillTone = (isSelected: boolean, isMine: boolean) => {
  if (isSelected) return "bg-accent-foreground"

  return isMine ? "bg-accent" : "bg-muted"
}

/**
 * A month of days to pick from: how full each one is, and yours. Also the
 * phone's calendar sheet (`className` sizes it there).
 */
export const MonthCalendar = ({
  onPick,
  className = "w-72",
}: {
  onPick: (day: Day) => void
  className?: string
}) => {
  const day = useOfficeStore((state) => state.booking.day)
  const today = useOfficeStore((state) => state.booking.today)
  const from = useOfficeStore((state) => state.booking.from)
  const opening = useOfficeStore((state) => state.booking.opening)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const objects = useAllPieces()
  const me = useOfficeStore((state) => state.booking.me)
  const { t, format } = useI18n()
  const [month, setMonth] = useState(() => monthOf(day))
  const getTeamsIn = useTeamDays()
  const myTeams = useMyTeams()
  const teamsWithDays = myTeams.filter((team) => team.weekdays.length > 0)

  // How full each day is: permanent residents every day + bookings on the rest.
  const { seats, residents, myResident, bookable } = useMemo(() => {
    const desks = objects.filter((object) => isSeatable(object.type))
    const resident = desks.filter((desk) => desk.assignee)

    return {
      seats: desks.length,
      residents: resident.length,
      myResident: !!me && resident.some((desk) => desk.assignee === me),
      bookable: new Set(desks.filter((desk) => !desk.assignee).map((desk) => desk.id)),
    }
  }, [objects, me])
  const fill = (shownDay: Day) => {
    const booked = Object.keys(byDay[shownDay] ?? {}).filter((id) => bookable.has(id)).length

    return seats ? (residents + booked) / seats : 0
  }
  const mine = (desk: Day) => myResident || (!!me && Object.values(byDay[desk] ?? {}).includes(me))

  // Always six rows, so the popover never changes height between months.
  const start = weekStart(month)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const canPrev = monthOf(from) < month
  const canNext = monthOf(lastDay) > month

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("Previous month")}
          isDisabled={!canPrev}
          onPress={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-black text-foreground">{format.month(month)}</p>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={t("Next month")}
          isDisabled={!canNext}
          onPress={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {format.weekLetters().map((letter, i) => (
          <span key={i} className="pb-1 text-[0.64rem] font-black text-muted">
            {letter}
          </span>
        ))}
        {cells.map((cellDay) => {
          const inMonth = cellDay.slice(0, 7) === month.slice(0, 7)
          const enabled = inMonth && cellDay >= from && cellDay <= lastDay
          const selected = cellDay === day
          const isMine = enabled && mine(cellDay)
          // Closed (a holiday, a weekend it doesn't open): shown, struck through.
          const isClosed = enabled && !isOpenDay(cellDay, opening)
          const closedReason = opening.closedDays[cellDay]
          // A day your team comes in together: its colour in the corner.
          const team = enabled && !isClosed ? getTeamsIn(cellDay)[0] : undefined

          return (
            <button
              key={cellDay}
              type="button"
              disabled={!enabled}
              onClick={() => onPick(cellDay)}
              aria-label={
                isClosed
                  ? `${format.long(cellDay)} · ${closedReason || t("Closed")}`
                  : format.long(cellDay)
              }
              title={isClosed ? closedReason || t("Closed") : undefined}
              aria-pressed={selected}
              className={clsx(
                "relative flex h-10 flex-col items-center justify-center gap-1 rounded-lg text-[0.8rem] font-extrabold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                !inMonth && "invisible",
                getDayTone(selected, enabled),
                !selected && cellDay === today && "text-accent",
                isClosed && !selected && "text-muted line-through decoration-2"
              )}
            >
              {team && (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 size-1.5 rounded-full"
                  style={{ background: getTeamHex(team.color) }}
                />
              )}
              {Number(cellDay.slice(8))}
              <span
                className={clsx(
                  "h-[3px] w-5 overflow-hidden rounded-full",
                  selected ? "bg-accent-foreground/30" : "bg-separator",
                  !enabled && "opacity-0"
                )}
              >
                <span
                  className={clsx("block h-full rounded-full", getFillTone(selected, isMine))}
                  style={{ width: `${Math.round(fill(cellDay) * 100)}%` }}
                />
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{t("Bookable until {day}", { day: { day: lastDay } })}</span>
        <button
          type="button"
          onClick={() => onPick(today)}
          // A bigger hit area than the word, without moving it.
          className="-m-2 p-2 font-bold text-accent hover:underline"
        >
          {t("Today")}
        </button>
      </div>
      <p className="mt-1.5 text-[0.7rem] text-muted">
        {t("Bar: how full · blue: you have a desk")}
      </p>
      {teamsWithDays.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted">
          {teamsWithDays.map((team) => (
            <span key={team.id} className="flex items-center gap-1">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: getTeamHex(team.color) }}
              />
              {t("{team}'s days", { team: team.name })}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
