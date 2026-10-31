import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { isSeatable } from "../catalog"
import { useOfficeStore } from "../store"
import { addDays, weekStart, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import { useAllPieces } from "~/editor"

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
    <div className="flex items-center gap-0.5 rounded-xl bg-surface-secondary p-0.5">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
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
          className="flex h-8 w-44 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-surface text-sm font-extrabold tabular-nums text-foreground shadow-surface outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CalendarDays className="size-4 text-accent" />
          {format.long(day)}
          {day === today && (
            <span className="text-[0.64rem] font-black uppercase tracking-wider text-accent">
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
        aria-label={t("Next day")}
        isDisabled={day >= lastDay}
        onPress={() => step(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
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
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const byDay = useOfficeStore((state) => state.booking.byDay)
  const objects = useAllPieces()
  const me = useOfficeStore((state) => state.booking.me)
  const { t, format } = useI18n()
  const [month, setMonth] = useState(() => monthOf(day))

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

          return (
            <button
              key={cellDay}
              type="button"
              disabled={!enabled}
              onClick={() => onPick(cellDay)}
              aria-label={format.long(cellDay)}
              aria-pressed={selected}
              className={clsx(
                "flex h-10 flex-col items-center justify-center gap-1 rounded-lg text-[0.8rem] font-extrabold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                !inMonth && "invisible",
                getDayTone(selected, enabled),
                !selected && cellDay === today && "text-accent"
              )}
            >
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
    </div>
  )
}
