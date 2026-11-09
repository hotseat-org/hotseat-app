import { toast } from "@heroui/react"
import { Armchair, Pin, Star } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useFetcher, useNavigate, useParams } from "react-router"
import { BookingRow, ROW_LINK, deskText } from "./BookingRow"
import { ScrollArea } from "~/components/ui/ScrollArea"
import { useOfficeStore } from "~/office/store"
import { useMyTeams, useTeamDays } from "~/office/teams"
import { floorText, useDeskFloor } from "~/office/booking/useBooking"
import { useAllPieces } from "~/editor"
import type { MyBooking } from "~/core/reservation/mine"
import type { MyBookingsData } from "~/routes/api.my-bookings.$slug"
import type { ReservationActionData } from "~/routes/api.reservations.$slug.$officeSlug"
import { addDays, type Day } from "~/utils/booking"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * "My bookings": your upcoming days in every office of the organization, and
 * any desk that's permanently yours. Show jumps the map to that day (and
 * office); Cancel asks once, inline, then frees the day.
 * Content only: the desktop's modal or the phone's sheet brings its title
 * and closing, at a fixed height — the list scrolls inside.
 */
/** My bookings' parts, for the page or sheet that shows them. */
export interface MyBookingsParts {
  /** The news: "3 days ahead." */
  title: ReactNode
  /** In short: "Next: tomorrow, Desk D1." */
  summary: ReactNode
  /** The list. */
  body: ReactNode
}

/** The fetcher that holds your bookings, shared by the page and the shell. */
const MY_BOOKINGS_KEY = "my-bookings"

/**
 * Your bookings, loaded ahead while the office is open (and again when the
 * map's bookings change), so My bookings opens with them already there.
 * The shell calls it; it keeps the data while the page comes and goes.
 */
export const useMyBookingsAhead = () => {
  const { slug } = useParams()
  const list = useFetcher<MyBookingsData>({ key: MY_BOOKINGS_KEY })
  const byDay = useOfficeStore((s) => s.booking.byDay)
  const load = list.load
  useEffect(() => {
    if (slug) load(`/api/my-bookings/${slug}`)
  }, [load, slug, byDay])
}

export const MyBookings = ({
  onShow,
  onFindSeat,
  isPhone = false,
  frame,
}: {
  /** After Show moved the map to a booking (its modal or sheet closes, so the map shows). */
  onShow?: () => void
  /** Opens Find a seat (nothing booked yet: the way to book). */
  onFindSeat: () => void
  /** In the phone's sheet: its words are for touch. */
  isPhone?: boolean
  /** Shows the parts in a page of its own (the desktop's column); none: in place. */
  frame?: (parts: MyBookingsParts) => ReactNode
}) => {
  const { slug, officeSlug } = useParams()
  const i18n = useI18n()
  const { t, tn, format } = i18n
  const navigate = useNavigate()
  // Shared with the shell, which loads it ahead (see useMyBookingsAhead): the
  // page opens with your days already there, not a loading state first.
  const list = useFetcher<MyBookingsData>({ key: MY_BOOKINGS_KEY })
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
  useEffect(() => {
    const d = cancel.data
    if (!d || cancel.state !== "idle") return
    if (!d.ok) {
      toast.danger(d.error)
      setHidden(new Set())
    }
    load(url)
  }, [cancel.data, cancel.state, load, url])

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
    setHidden((h) => new Set(h).add(keyOf(b)))
    if (b.officeSlug === officeSlug && me) applyCancel(me, [b.date])
    cancel.submit(
      { intent: "cancel", dates: JSON.stringify([b.date]) },
      { method: "post", action: `/api/reservations/${slug}/${b.officeSlug}` }
    )
  }

  const count = days.reduce((n, [, bs]) => n + bs.length, 0)
  // Each booking's place in the whole list: when its row arrives in the cascade.
  const bookingIndex = new Map(days.flatMap(([, bs]) => bs).map((b, index) => [keyOf(b), index]))
  const getTeamsIn = useTeamDays()
  const myTeams = useMyTeams()
  const weekdayNames = format.weekShort()
  // "Design comes in on Tue, Thu": when to book, for someone with nothing booked.
  const teamDays = myTeams
    .filter((team) => team.weekdays.length > 0)
    .map((team) =>
      t("{team} comes in on {days}.", {
        team: team.name,
        days: team.weekdays.map((weekday) => weekdayNames[weekday - 1]).join(", "),
      })
    )

  // The headline: how many days you're in, then the next one.
  const next = days[0]?.[1][0]
  const getWhen = (date: Day, today: Day) =>
    date === today ? t("today") : date === addDays(today, 1) ? t("tomorrow") : format.onDay(date)
  const title = !data
    ? t("My bookings")
    : count
      ? tn(count, "{n} day ahead.", "{n} days ahead.")
      : t("Nothing booked.")
  const summary = next
    ? t("Next: {when}, {desk}.", {
        when: getWhen(next.date, next.today),
        desk: deskText(i18n, next.deskLabel, next.deskFloor && floorText(i18n, next.deskFloor)),
      })
    : data && teamDays[0]

  const body = (
    <ScrollArea frameClassName="-mx-1 flex-1" className="flex flex-col gap-5 px-1">
      <HereSection onShow={onShow} />
      {data?.permanent.map((p) => (
        <button
          key={p.deskId}
          type="button"
          onClick={() => show(p)}
          className="flex items-center gap-3 border-b border-separator py-3 text-left"
        >
          <Pin className="size-5 shrink-0 text-accent" />
          <span className="min-w-0">
            <span className="block text-xl leading-tight font-black tracking-[-0.01em] text-accent">
              {t("Permanent: {desk}", {
                desk: deskText(i18n, p.deskLabel, p.deskFloor && floorText(i18n, p.deskFloor)),
              })}
            </span>
            <span className="block truncate text-sm font-semibold text-muted">
              {t("{office}, every day", { office: p.officeName })}
            </span>
          </span>
        </button>
      ))}

      {!data && !error && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse border-b border-separator bg-surface-secondary/60"
            />
          ))}
        </div>
      )}
      {error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>}

      {data && count === 0 && (
        <div className="flex flex-col items-start gap-4 pt-2">
          <p className="text-lg font-semibold text-muted">
            {isPhone
              ? t("Find a seat that suits you, or tap a free desk on the plan.")
              : t("Find a seat that suits you, or click a free desk on the map.")}
          </p>
          <button
            type="button"
            onClick={onFindSeat}
            className="flex min-h-12 items-center gap-2 rounded-full bg-action-primary px-6 text-base font-black text-action-primary-text outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Armchair className="size-5" /> {t("Find a seat")}
          </button>
        </div>
      )}

      {/* One line a booking, its day first (board H4). */}
      {days.length > 0 && (
        <div className="flex flex-col">
          {days.flatMap(([date, bookings]) =>
            bookings.map((b) => (
              <BookingRow
                index={bookingIndex.get(keyOf(b)) ?? 0}
                key={keyOf(b)}
                dayLabel={date === b.today ? t("Today") : format.short(date)}
                desk={deskText(i18n, b.deskLabel, b.deskFloor && floorText(i18n, b.deskFloor))}
                detail={[
                  b.officeName,
                  ...getTeamsIn(b.date).map((team) => t("{team}'s day", { team: team.name })),
                ].join(", ")}
                day={b.date}
                onShow={() => show(b)}
                onCancel={() => doCancel(b)}
              />
            ))
          )}
        </div>
      )}
    </ScrollArea>
  )

  if (frame) return frame({ title, summary, body })

  return (
    <section aria-label={t("My bookings")} className="flex min-h-0 flex-1 flex-col">
      <header className="mb-4">
        <p className="text-2xl leading-tight font-black tracking-[-0.02em] text-foreground">
          {title}
        </p>
        {summary && <p className="mt-1 text-base font-bold text-muted">{summary}</p>}
      </header>
      {body}
    </section>
  )
}

/**
 * In this office: your usual desk (booked for you on its weekdays) and your
 * favourite desks — Show finds one on the map; the star takes it off the list.
 */
const HereSection = ({ onShow }: { onShow?: () => void }) => {
  const objects = useAllPieces()
  const getDeskFloor = useDeskFloor()
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
    // Your saved desks, as the days below them: ruled lines of large type —
    // what it is, the desk in blue, and words to act on it.
    <div className="flex flex-col">
      <p className="pb-1 text-xl font-black text-foreground">{t("In this office")}</p>
      {usualDesk && usual && (
        <div className="flex h-[68px] items-center gap-4 border-b border-separator">
          <span className="w-24 shrink-0 text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
            {t("Usual")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl leading-tight font-black tracking-[-0.01em] text-accent">
              {deskText(i18n, usualDesk.label, getDeskFloor(usualDesk))}
            </p>
            <p className="truncate text-sm font-semibold text-muted">
              {t("Booked for you every {days}", {
                days: usual.weekdays.map((weekday) => format.weekShort()[weekday - 1]).join(", "),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => show(usualDesk.id)}
            className={`${ROW_LINK} text-foreground`}
          >
            {t("Show")}
          </button>
          <button
            type="button"
            onClick={() => setPreference({ intent: "usual-clear" })}
            className={`${ROW_LINK} text-danger`}
          >
            {t("Remove")}
          </button>
        </div>
      )}
      {starred.map((desk) => (
        <div key={desk.id} className="flex h-[68px] items-center gap-4 border-b border-separator">
          <span className="flex w-24 shrink-0 items-center gap-1.5 text-xl leading-tight font-black tracking-[-0.01em] text-foreground">
            <Star className="size-4 text-warning" fill="currentColor" aria-hidden />
            {t("Starred")}
          </span>
          <p className="min-w-0 flex-1 truncate text-xl leading-tight font-black tracking-[-0.01em] text-accent">
            {deskText(i18n, desk.label, getDeskFloor(desk))}
          </p>
          <button
            type="button"
            onClick={() => show(desk.id)}
            className={`${ROW_LINK} text-foreground`}
          >
            {t("Show")}
          </button>
          <button
            type="button"
            aria-label={t("Remove {desk} from favourites", {
              desk: deskText(i18n, desk.label, getDeskFloor(desk)),
            })}
            onClick={() => {
              applyFavorite(desk.id, false)
              setPreference({ intent: "favorite", deskId: desk.id, isFavorite: "false" })
            }}
            className={`${ROW_LINK} text-danger`}
          >
            {t("Remove")}
          </button>
        </div>
      ))}
    </div>
  )
}
