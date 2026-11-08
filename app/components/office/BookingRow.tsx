import { Button } from "@heroui/react"
import clsx from "clsx"
import { MapPin } from "lucide-react"
import { useState } from "react"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"
import type { Day } from "~/utils/booking"

/** "Desk B2" (or "A desk") — with its floor in an office with floors: "Desk B2 · Attic". */
export const deskText = ({ t }: Translator, label?: string, floor?: string | null) => {
  const desk = label ? t("Desk {label}", { label }) : t("A desk")

  return floor ? `${desk} · ${floor}` : desk
}

/**
 * A day you've booked: the desk, a line under it, Show and Cancel — which
 * asks once, in place (the row keeps its height), before it frees the day.
 * In your bookings, and in finding a seat (the desk just booked, or the one
 * you have that day).
 */
export const BookingRow = ({
  desk,
  detail,
  day,
  onShow,
  onCancel,
}: {
  /** The desk, as deskText says it. */
  desk: string
  /** Under it: the office, or the day. */
  detail: string
  /** Its day (asked about before cancelling). */
  day: Day
  onShow: () => void
  onCancel: () => void
}) => {
  const { t, format } = useI18n()
  const [isAsking, setIsAsking] = useState(false)

  return (
    // Fixed height: asking "Cancel?" swaps the row's content in place.
    <div
      className={clsx(
        // A ruled row, not a card (the headline's lists): the line under it, no box.
        "flex h-16 items-center gap-3 border-b px-1",
        isAsking ? "border-danger/40 bg-danger/5" : "border-separator"
      )}
    >
      {isAsking ? (
        <>
          <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-foreground">{desk}</p>
            <p className="truncate text-sm text-muted">{detail}</p>
          </div>
          <Button size="sm" variant="ghost" onPress={onShow}>
            <MapPin className="size-4" /> {t("Show")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger"
            onPress={() => setIsAsking(true)}
          >
            {t("Cancel")}
          </Button>
        </>
      )}
    </div>
  )
}
