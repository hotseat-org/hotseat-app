import { Button, CloseButton, toast } from "@heroui/react"
import clsx from "clsx"
import { CalendarDays, MapPin, Pin, Repeat, Star } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useFetcher, useNavigate, useParams } from "react-router"
import { PANEL } from "./shell-ui"
import { useOfficeStore } from "~/office/store"
import type { MyBooking } from "~/core/reservation/mine"
import type { MyBookingsData } from "~/routes/api.my-bookings.$slug"
import type { ReservationActionData } from "~/routes/api.reservations.$slug.$officeSlug"
import type { Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"
import type { Translator } from "~/i18n/translate"

const deskText = ({ t }: Translator, label?: string) =>
  label ? t("Desk {label}", { label }) : t("A desk")

/**
 * "My bookings": your upcoming days in every office of the organization, and
 * any desk that's permanently yours. Show jumps the map to that day (and
 * office); Cancel asks once, inline, then frees the day.
 *
 * Anchored top and bottom next to the rail, so its size never depends on how
 * many bookings there are — the list scrolls inside.
 */
export const MyBookings = ({
  onClose,
  onShow,
  isSheet = false,
}: {
  onClose: () => void
  /** After Show moved the map to a booking (the phone switches to its Office tab). */
  onShow?: () => void
  /** Phones: inside a bottom sheet, which brings the title and closing. */
  isSheet?: boolean
}) => {
  const { slug, officeSlug } = useParams()
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const navigate = useNavigate()
  const list = useFetcher<MyBookingsData>()
  const cancel = useFetcher<ReservationActionData>()
  const setDay = useOfficeStore((s) => s.setBookingDay)
  const applyCancel = useOfficeStore((s) => s.applyCancel)
  const me = useOfficeStore((s) => s.booking.me)
  // The map's bookings: when they change (you booked or cancelled on the map),
  // this list is stale — reload it.
  const byDay = useOfficeStore((s) => s.booking.byDay)
  const load = list.load
  const url = `/api/my-bookings/${slug}`
  useEffect(() => {
    load(url)
  }, [load, url, byDay])

  // Rows being cancelled: hidden at once, restored if the server says no.
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    const d = cancel.data
    if (!d || cancel.state !== "idle") return
    if (!d.ok) {
      toast.danger(d.error)
      setHidden(new Set())
    }
    load(url)
  }, [cancel.data, cancel.state, load, url])

  useEffect(() => {
    if (isSheet) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose, isSheet])

  const data = list.data && !("error" in list.data) ? list.data : undefined
  const error = list.data && "error" in list.data ? list.data.error : undefined
  const keyOf = (b: MyBooking) => `${b.officeSlug}:${b.date}`
  // Once a fresh list no longer has a cancelled row, stop hiding it (so booking
  // that day again later shows up).
  useEffect(() => {
    if (!data) return
    const present = new Set(data.bookings.map(keyOf))
    setHidden((h) => {
      const next = new Set([...h].filter((k) => present.has(k)))
      return next.size === h.size ? h : next
    })
  }, [data])
  const days = useMemo(() => {
    const groups = new Map<Day, MyBooking[]>()
    for (const b of data?.bookings ?? []) {
      if (hidden.has(keyOf(b))) continue
      groups.set(b.date, [...(groups.get(b.date) ?? []), b])
    }
    return [...groups.entries()]
  }, [data, hidden])

  const show = (b: { officeSlug: string; date?: Day }) => {
    if (b.officeSlug === officeSlug) {
      if (b.date) setDay(b.date)
    } else navigate(`/app/o/${slug}/offices/${b.officeSlug}${b.date ? `?day=${b.date}` : ""}`)
    onShow?.()
  }
  const doCancel = (b: MyBooking) => {
    setConfirming(null)
    setHidden((h) => new Set(h).add(keyOf(b)))
    if (b.officeSlug === officeSlug && me) applyCancel(me, [b.date])
    cancel.submit(
      { intent: "cancel", dates: JSON.stringify([b.date]) },
      { method: "post", action: `/api/reservations/${slug}/${b.officeSlug}` }
    )
  }

  const count = days.reduce((n, [, bs]) => n + bs.length, 0)

  return (
    <section
      aria-label={t("My bookings")}
      className={clsx(
        "flex flex-col",
        isSheet
          ? "min-h-0 flex-1"
          : clsx(PANEL, "absolute bottom-24 left-[5.75rem] top-24 w-[340px] p-4")
      )}
    >
      <header className="mb-3 flex items-start justify-between">
        <div>
          {!isSheet && (
            <h2 className="text-lg font-extrabold text-foreground">{t("My bookings")}</h2>
          )}
          <p className="text-xs text-muted">
            {data
              ? count
                ? tn(count, "{n} upcoming day", "{n} upcoming days")
                : t("Nothing booked yet")
              : t("Loading…")}
          </p>
        </div>
        {!isSheet && <CloseButton aria-label={t("Close my bookings")} onPress={onClose} />}
      </header>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
        <HereSection onShow={onShow} />
        {data?.permanent.map((p) => (
          <button
            key={p.deskId}
            type="button"
            onClick={() => show(p)}
            className="flex items-center gap-3 rounded-xl bg-accent/12 p-3 text-left transition-colors hover:bg-accent/20"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Pin className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">
                {t("Permanent: {desk}", { desk: deskText(i18n, p.deskLabel) })}
              </span>
              <span className="block truncate text-xs text-muted">
                {p.officeName} · {t("every day")}
              </span>
            </span>
          </button>
        ))}

        {!data && !error && (
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-secondary" />
            ))}
          </div>
        )}
        {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

        {data && count === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="grid size-11 place-items-center rounded-2xl bg-accent/12 text-accent">
              <CalendarDays className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t("No upcoming bookings")}</p>
              <p className="mt-0.5 text-xs text-muted">
                {isSheet
                  ? t("Pick a day at the bottom of the Office tab, then tap a free desk.")
                  : t("Pick a day at the bottom, then click a free desk on the map.")}
              </p>
            </div>
          </div>
        )}

        {days.map(([date, bookings]) => (
          <div key={date} className="flex flex-col gap-1.5">
            <p className="text-[0.64rem] font-extrabold uppercase tracking-wider text-muted">
              {format.long(date)}
              {date === bookings[0].today && (
                <span className="ml-1.5 text-accent">{t("Today")}</span>
              )}
            </p>
            {bookings.map((b) => {
              const key = keyOf(b)
              const asking = confirming === key
              return (
                // Fixed height: asking "Cancel?" swaps the row's content in place.
                <div
                  key={key}
                  className={clsx(
                    "flex h-16 items-center gap-3 rounded-xl border px-3",
                    asking ? "border-danger/40 bg-danger/5" : "border-border bg-surface"
                  )}
                >
                  {asking ? (
                    <>
                      <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                        {t("Cancel {day}?", { day: format.short(b.date) })}
                      </p>
                      <Button size="sm" variant="ghost" onPress={() => setConfirming(null)}>
                        {t("Keep")}
                      </Button>
                      <Button size="sm" variant="danger" onPress={() => doCancel(b)}>
                        {t("Cancel it")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {deskText(i18n, b.deskLabel)}
                        </p>
                        <p className="truncate text-xs text-muted">{b.officeName}</p>
                      </div>
                      <Button size="sm" variant="ghost" onPress={() => show(b)}>
                        <MapPin className="size-4" /> {t("Show")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onPress={() => setConfirming(key)}
                      >
                        {t("Cancel")}
                      </Button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * In this office: your usual desk (booked for you on its weekdays) and your
 * favourite desks — Show finds one on the map; the star takes it off the list.
 */
const HereSection = ({ onShow }: { onShow?: () => void }) => {
  const objects = useOfficeStore((s) => s.objects)
  const { favorites, usual } = useOfficeStore((s) => s.booking.preferences)
  const setPreference = useOfficeStore((s) => s.booking.setPreference)
  const applyFavorite = useOfficeStore((s) => s.applyFavorite)
  const spotlightSeat = useOfficeStore((s) => s.spotlightSeat)
  const i18n = useI18n()
  const { t, format } = i18n
  const deskOf = (id: string) => objects.find((o) => o.id === id)
  const usualDesk = usual && deskOf(usual.deskId)
  const starred = favorites.map(deskOf).filter((d) => !!d)
  if (!usualDesk && !starred.length) return null
  const show = (id: string) => {
    spotlightSeat(id)
    onShow?.()
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.64rem] font-black uppercase tracking-wider text-muted">
        {t("In this office")}
      </p>
      {usualDesk && usual && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/12 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Repeat className="size-4" />
          </span>
          <button
            type="button"
            onClick={() => show(usualDesk.id)}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-sm font-bold text-foreground">
              {t("Usual: {desk}", { desk: deskText(i18n, usualDesk.label) })}
            </span>
            <span className="block truncate text-xs text-muted">
              {t("Booked for you every {days}", {
                days: usual.weekdays.map((w) => format.weekShort()[w - 1]).join(", "),
              })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPreference({ intent: "usual-clear" })}
            className="text-xs font-bold text-muted hover:text-foreground"
          >
            {t("Remove")}
          </button>
        </div>
      )}
      {starred.map((desk) => (
        <div
          key={desk.id}
          className="flex items-center gap-3 rounded-xl bg-surface-secondary p-2.5"
        >
          <button
            type="button"
            aria-label={t("Remove {desk} from favourites", { desk: deskText(i18n, desk.label) })}
            onClick={() => {
              applyFavorite(desk.id, false)
              setPreference({ intent: "favorite", deskId: desk.id, isFavorite: "false" })
            }}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-warning hover:bg-warning/15"
          >
            <Star className="size-4" fill="currentColor" />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            {deskText(i18n, desk.label)}
          </span>
          <button
            type="button"
            onClick={() => show(desk.id)}
            className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
          >
            <MapPin className="size-3.5" /> {t("Show")}
          </button>
        </div>
      ))}
    </div>
  )
}
