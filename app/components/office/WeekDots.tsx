import clsx from "clsx"
import { useEditorStore } from "~/components/OfficeEditor/store"
import type { useWeekPresence } from "~/components/OfficeEditor/useBooking"
import { formatLong } from "~/utils/booking"

/**
 * Someone's week at a glance: Mon–Fri, filled on the days they have a desk
 * (the shown day ringed) — for planning around colleagues.
 */
export const WeekDots = ({
  email,
  presence,
}: {
  email: string
  presence: ReturnType<typeof useWeekPresence>
}) => {
  const day = useEditorStore((s) => s.booking.day)
  const inDays = presence.days.filter((d) => presence.isIn(email, d))
  return (
    <span
      className="flex gap-0.5"
      aria-label={
        inDays.length ? `In this week: ${inDays.map(formatLong).join(", ")}` : "Not in this week"
      }
    >
      {presence.days.map((d) => (
        <span
          key={d}
          aria-hidden
          className={clsx(
            "h-1.5 w-3 rounded-full",
            presence.isIn(email, d) ? "bg-success" : "bg-foreground/12",
            d === day && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-surface"
          )}
        />
      ))}
    </span>
  )
}
