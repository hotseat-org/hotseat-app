import clsx from "clsx"
import { CalendarCheck2, CalendarX2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFetcher, useParams, useRouteLoaderData } from "react-router"
import { CardTitle, SettingsCard } from "../ui"
import { Button } from "~/components/Button"
import { useI18n } from "~/i18n/I18nProvider"
import { ALL_WEEKDAYS, addDays, type Day, type OfficeOpening } from "~/utils/booking"

interface OpeningResult {
  ok: boolean
  intent?: "set-weekdays" | "close-days" | "reopen-day"
  cancelled?: number
  error?: string
}

/** The office's booking data: when it's open (refreshed after each change here). */
const useOpening = () =>
  (
    useRouteLoaderData("routes/app.o.$slug.offices.$officeSlug") as
      | { booking?: { today: Day; opening: OfficeOpening } }
      | undefined
  )?.booking

/** A date field's text style (the browser's own date picker). */
const DATE_FIELD =
  "h-10 rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:border-accent"

/**
 * Office settings → Opening: the weekdays people can book, and days the office
 * is closed (holidays, a move). Closing cancels bookings already made for
 * those days; their people are told why.
 */
export function OfficeOpening() {
  const { slug, officeSlug } = useParams()
  const { t, tn, format } = useI18n()
  const booking = useOpening()
  const action = `/api/settings/office/${slug}/${officeSlug}/opening`
  const weekdaysFetcher = useFetcher<OpeningResult>()
  const closeFetcher = useFetcher<OpeningResult>()
  const reopenFetcher = useFetcher<OpeningResult>()

  const saved = booking?.opening.openWeekdays ?? ALL_WEEKDAYS
  const [weekdays, setWeekdays] = useState(saved)
  useEffect(() => setWeekdays(saved), [saved])

  const today = booking?.today ?? ""
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [reason, setReason] = useState("")
  // Closed: start the form over.
  useEffect(() => {
    if (closeFetcher.state === "idle" && closeFetcher.data?.ok) {
      setFrom("")
      setTo("")
      setReason("")
    }
  }, [closeFetcher.state, closeFetcher.data])

  if (!booking) return null

  const toggleWeekday = (weekday: number) =>
    setWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((day) => day !== weekday)
        : [...current, weekday].sort()
    )
  const isWeekdaysChanged = weekdays.join() !== saved.join()
  // Monday 2 Nov 2026 is a Monday: the week's day names from there.
  const weekdayName = (weekday: number) => format.dow(addDays("2026-11-02", weekday - 1))
  const closedDays = Object.entries(booking.opening.closedDays).sort(([first], [second]) =>
    first.localeCompare(second)
  )
  const cancelledNote = (result?: OpeningResult) =>
    result?.ok && result.cancelled
      ? tn(
          result.cancelled,
          "{n} booking was cancelled; its owner was told.",
          "{n} bookings were cancelled; their owners were told."
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <SettingsCard className="flex flex-col gap-4">
        <div>
          <CardTitle>{t("Open for booking")}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {t("People can book desks on these days of the week.")}
          </p>
        </div>
        <weekdaysFetcher.Form method="POST" action={action} className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="set-weekdays" />
          <input type="hidden" name="weekdays" value={weekdays.join(",")} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("Open for booking")}>
            {ALL_WEEKDAYS.map((weekday) => (
              <button
                key={weekday}
                type="button"
                aria-pressed={weekdays.includes(weekday)}
                onClick={() => toggleWeekday(weekday)}
                className={clsx(
                  "min-h-10 min-w-14 rounded-xl border px-3 text-sm font-bold transition-colors",
                  weekdays.includes(weekday)
                    ? "border-accent bg-accent/12 text-accent"
                    : "border-border text-muted line-through hover:text-foreground"
                )}
              >
                {weekdayName(weekday)}
              </button>
            ))}
          </div>
          {/* Reserved: the card doesn't grow when a message appears. */}
          <p role="status" className="min-h-5 text-sm text-muted">
            {weekdaysFetcher.data?.ok === false
              ? weekdaysFetcher.data.error
              : (cancelledNote(weekdaysFetcher.data) ??
                (isWeekdaysChanged && t("Bookings already made on days you close are cancelled.")))}
          </p>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isDisabled={!isWeekdaysChanged || weekdays.length === 0}
              isPending={weekdaysFetcher.state !== "idle"}
            >
              {t("Save")}
            </Button>
          </div>
        </weekdaysFetcher.Form>
      </SettingsCard>

      <SettingsCard className="flex flex-col gap-4">
        <div>
          <CardTitle>{t("Closed days")}</CardTitle>
          <p className="mt-1 text-sm text-muted">
            {t(
              "Holidays and other days nobody can book. Bookings already made for them are cancelled, and their owners told."
            )}
          </p>
        </div>

        <closeFetcher.Form method="POST" action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="intent" value="close-days" />
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            {t("From")}
            <input
              type="date"
              name="from"
              required
              min={today}
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                if (!to || to < event.target.value) setTo(event.target.value)
              }}
              className={DATE_FIELD}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-muted">
            {t("To")}
            <input
              type="date"
              name="to"
              required
              min={from || today}
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={DATE_FIELD}
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-bold text-muted">
            {t("Reason (optional)")}
            <input
              name="reason"
              maxLength={80}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("e.g. Christmas")}
              className={DATE_FIELD}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            isPending={closeFetcher.state !== "idle"}
          >
            <CalendarX2 className="size-4" /> {t("Close")}
          </Button>
        </closeFetcher.Form>
        <p role="status" className="min-h-5 text-sm text-muted">
          {closeFetcher.data?.ok === false
            ? closeFetcher.data.error
            : cancelledNote(closeFetcher.data)}
        </p>

        {closedDays.length === 0 ? (
          <p className="text-sm text-muted">{t("No closed days ahead.")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-separator border-y border-separator">
            {closedDays.map(([date, closedReason]) => (
              <li key={date} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{format.long(date)}</span>
                  {closedReason && (
                    <span className="block truncate text-xs text-muted">{closedReason}</span>
                  )}
                </span>
                <reopenFetcher.Form method="POST" action={action}>
                  <input type="hidden" name="intent" value="reopen-day" />
                  <input type="hidden" name="date" value={date} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    aria-label={t("Open on {day}", { day: format.long(date) })}
                  >
                    <CalendarCheck2 className="size-4" /> {t("Open")}
                  </Button>
                </reopenFetcher.Form>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </div>
  )
}
