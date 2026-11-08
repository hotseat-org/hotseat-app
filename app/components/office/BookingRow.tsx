import { Button } from "@heroui/react"
import clsx from "clsx"
import { useState, type CSSProperties } from "react"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"
import type { Day } from "~/utils/booking"

/** "Desk B2" (or "A desk") — with its floor in an office with floors: "Desk B2 · Attic". */
export const deskText = ({ t }: Translator, label?: string, floor?: string | null) => {
  const desk = label ? t("Desk {label}", { label }) : t("A desk")

  return floor ? `${desk} · ${floor}` : desk
}

/** Show and Cancel: words, not buttons (the headline's lists). */
const LINK =
  "min-h-11 shrink-0 px-1 text-[15px] font-extrabold underline decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-focus"

/**
 * A day you've booked, as a line of type: the day (in your bookings), the
 * desk in large blue type, a note under it, then Show and Cancel — which asks
 * once, in place (the row keeps its height), before it frees the day. In your
 * bookings, and in finding a seat (the desk just booked, or the one you have
 * that day).
 */
export const BookingRow = ({
  dayLabel,
  desk,
  detail,
  day,
  onShow,
  onCancel,
  index = 0,
}: {
  /** The day, first in the row ("Tue 10"); none where the day's already said. */
  dayLabel?: string
  /** The desk, as deskText says it. */
  desk: string
  /** Under it: the office, or the day. */
  detail: string
  /** Its day (asked about before cancelling). */
  day: Day
  onShow: () => void
  onCancel: () => void
  /** Its place in the list: when it arrives in the cascade. */
  index?: number
}) => {
  const { t, format } = useI18n()
  const [isAsking, setIsAsking] = useState(false)

  return (
    // Fixed height: asking "Cancel?" swaps the row's content in place. A ruled
    // line, not a card; it arrives with the others in a quick cascade.
    <div
      style={{ "--index": index } as CSSProperties}
      className={clsx(
        "motion-stagger flex h-[68px] items-center gap-4 border-b",
        isAsking ? "border-danger/40 bg-danger/5 px-2" : "border-separator"
      )}
    >
      {isAsking ? (
        <>
          <p className="min-w-0 flex-1 text-base font-extrabold text-foreground">
            {t("Cancel {day}?", { day: format.short(day) })}
          </p>
          <Button size="sm" variant="ghost" onPress={() => setIsAsking(false)}>
            {t("Keep")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onPress={() => {
              setIsAsking(false)
              onCancel()
            }}
          >
            {t("Cancel it")}
          </Button>
        </>
      ) : (
        <>
          {dayLabel && (
            <span className="w-24 shrink-0 text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
              {dayLabel}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl leading-tight font-black tracking-[-0.01em] text-accent">
              {desk}
            </p>
            <p className="truncate text-sm font-semibold text-muted">{detail}</p>
          </div>
          <button type="button" onClick={onShow} className={`${LINK} text-foreground`}>
            {t("Show")}
          </button>
          <button type="button" onClick={() => setIsAsking(true)} className={`${LINK} text-danger`}>
            {t("Cancel")}
          </button>
        </>
      )}
    </div>
  )
}
