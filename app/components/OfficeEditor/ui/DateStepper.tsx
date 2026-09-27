import { Button, Popover } from "@heroui/react"
import clsx from "clsx"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { useEditorStore } from "../store"
import { isSeatable } from "../types"
import { addDays, formatLong, formatMonth, weekStart, type Day } from "~/utils/booking"

/**
 * The day being shown in the office: ‹ Wed 23 Sep › in the bottom bar, with a
 * month calendar (how full each day is, and your days) behind the date. Days
 * outside the loaded range (before this week, after the booking window) are
 * disabled. Fixed widths throughout, so nothing shifts as the date changes.
 */
export const DateStepper = () => {
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const from = useEditorStore((s) => s.booking.from)
  const lastDay = useEditorStore((s) => s.booking.lastDay)
  const setDay = useEditorStore((s) => s.setBookingDay)
  const [open, setOpen] = useState(false)

  const step = (n: number) => {
    const next = addDays(day, n)
    if (next >= from && next <= lastDay) setDay(next)
  }

  return (
    <div className="flex items-center gap-0.5 rounded-xl bg-surface-secondary p-0.5">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="Previous day"
        isDisabled={day <= from}
        onPress={() => step(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Popover isOpen={open} onOpenChange={setOpen}>
        {/* The trigger is itself the (focusable, pressable) button. */}
        <Popover.Trigger
          aria-label={`Showing ${formatLong(day)}. Pick another day`}
          className="flex h-8 w-44 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-surface text-sm font-extrabold tabular-nums text-foreground shadow-surface outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CalendarDays className="size-4 text-accent" />
          {formatLong(day)}
          {day === today && (
            <span className="text-[0.64rem] font-black uppercase tracking-wider text-accent">
              Today
            </span>
          )}
        </Popover.Trigger>
        <Popover.Content placement="top" offset={14} className="rounded-2xl">
          <Popover.Dialog aria-label="Pick a day" className="p-4 outline-none">
            <MonthCalendar
              onPick={(d) => {
                setDay(d)
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
        aria-label="Next day"
        isDisabled={day >= lastDay}
        onPress={() => step(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

/** First day of the day's month. */
const monthOf = (day: Day) => `${day.slice(0, 8)}01`
const shiftMonth = (month: Day, n: number) => {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 10)
}

const MonthCalendar = ({ onPick }: { onPick: (day: Day) => void }) => {
  const day = useEditorStore((s) => s.booking.day)
  const today = useEditorStore((s) => s.booking.today)
  const from = useEditorStore((s) => s.booking.from)
  const lastDay = useEditorStore((s) => s.booking.lastDay)
  const byDay = useEditorStore((s) => s.booking.byDay)
  const objects = useEditorStore((s) => s.objects)
  const me = useEditorStore((s) => s.booking.me)
  const [month, setMonth] = useState(() => monthOf(day))

  // How full each day is: permanent residents every day + bookings on the rest.
  const { seats, residents, myResident, bookable } = useMemo(() => {
    const desks = objects.filter((o) => isSeatable(o.type))
    const resident = desks.filter((d) => d.assignee)
    return {
      seats: desks.length,
      residents: resident.length,
      myResident: !!me && resident.some((d) => d.assignee === me),
      bookable: new Set(desks.filter((d) => !d.assignee).map((d) => d.id)),
    }
  }, [objects, me])
  const fill = (d: Day) => {
    const booked = Object.keys(byDay[d] ?? {}).filter((id) => bookable.has(id)).length
    return seats ? (residents + booked) / seats : 0
  }
  const mine = (d: Day) => myResident || (!!me && Object.values(byDay[d] ?? {}).includes(me))

  // Always six rows, so the popover never changes height between months.
  const start = weekStart(month)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const canPrev = monthOf(from) < month
  const canNext = monthOf(lastDay) > month

  return (
    <div className="w-72">
      <div className="mb-2 flex items-center justify-between">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Previous month"
          isDisabled={!canPrev}
          onPress={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-black text-foreground">{formatMonth(month)}</p>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Next month"
          isDisabled={!canNext}
          onPress={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1 text-[0.64rem] font-black text-muted">
            {w}
          </span>
        ))}
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === month.slice(0, 7)
          const enabled = inMonth && d >= from && d <= lastDay
          const selected = d === day
          const isMine = enabled && mine(d)
          return (
            <button
              key={d}
              type="button"
              disabled={!enabled}
              onClick={() => onPick(d)}
              aria-label={formatLong(d)}
              aria-pressed={selected}
              className={clsx(
                "flex h-10 flex-col items-center justify-center gap-1 rounded-lg text-[0.8rem] font-extrabold tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                !inMonth && "invisible",
                selected
                  ? "bg-accent text-accent-foreground"
                  : enabled
                    ? "text-foreground hover:bg-surface-secondary"
                    : "text-muted opacity-40",
                !selected && d === today && "text-accent"
              )}
            >
              {Number(d.slice(8))}
              <span
                className={clsx(
                  "h-[3px] w-5 overflow-hidden rounded-full",
                  selected ? "bg-accent-foreground/30" : "bg-separator",
                  !enabled && "opacity-0"
                )}
              >
                <span
                  className={clsx(
                    "block h-full rounded-full",
                    selected ? "bg-accent-foreground" : isMine ? "bg-accent" : "bg-muted"
                  )}
                  style={{ width: `${Math.round(fill(d) * 100)}%` }}
                />
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>Bookable until {formatLong(lastDay)}</span>
        <button
          type="button"
          onClick={() => onPick(today)}
          className="font-bold text-accent hover:underline"
        >
          Today
        </button>
      </div>
      <p className="mt-1.5 text-[0.7rem] text-muted">Bar: how full · blue: you have a desk</p>
    </div>
  )
}
