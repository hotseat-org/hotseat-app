import clsx from "clsx"
import { useEditorStore } from "~/editor"
import type { useWeekPresence } from "~/office/booking/useBooking"
import { useI18n } from "~/i18n/I18nProvider"

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
  const { t, format } = useI18n()
  const inDays = presence.days.filter((d) => presence.isIn(email, d))
  return (
    <span
      className="flex gap-0.5"
      aria-label={
        inDays.length
          ? t("In this week: {days}", { days: inDays.map(format.long).join(", ") })
          : t("Not in this week")
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
