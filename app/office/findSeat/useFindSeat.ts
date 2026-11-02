import { useCallback, useEffect, useMemo } from "react"
import { useParams } from "react-router"
import { isSeatable } from "../catalog"
import { useOfficeStore, useOfficeStoreApi } from "../store"
import { matchAnyDay, matchDay, type MatchContext, type MatchDesk, type SeatRule } from "./matching"
import { parseSeatRules } from "./seatRulesSchema"
import { useAllPieces } from "~/editor"
import { addDays, isOpenDay, isWeekend, type Day, type OfficeOpening } from "~/utils/booking"

/** Days shown to pick from (working days, from today). */
const DAY_CHOICES = 5
/** Days "any day" lists at first. */
const ANY_DAY_LIMIT = 5

/** Where this browser kept an office's rules, before they were kept on the server. */
const getLegacyStorageKey = (organization?: string, office?: string) =>
  `hotseat:find-seat:${organization ?? ""}/${office ?? ""}`

/** Rules this browser kept (none, or unreadable: none) — taken out, they're moved once. */
const takeLegacyRules = (key: string): SeatRule[] => {
  try {
    const rules = parseSeatRules(JSON.parse(localStorage.getItem(key) ?? "[]"))
    localStorage.removeItem(key)

    return rules
  } catch {
    return []
  }
}

/**
 * What you look for when finding a seat in this office — kept on the server,
 * so it's there on any device. Changed, it shows at once and is saved behind.
 * Rules this browser kept before are moved there once (if none are yet).
 */
export const useSavedRules = () => {
  const { slug, officeSlug } = useParams()
  const rules = useOfficeStore((state) => state.booking.preferences.seatRules)
  const store = useOfficeStoreApi()

  const setRules = useCallback(
    (next: SeatRule[]) => {
      const { booking, setBooking } = store.getState()
      setBooking({ preferences: { ...booking.preferences, seatRules: next } })
      booking.setPreference({ intent: "seat-rules", rules: JSON.stringify(next) })
    },
    [store]
  )

  useEffect(() => {
    const legacy = takeLegacyRules(getLegacyStorageKey(slug, officeSlug))
    if (legacy.length > 0 && store.getState().booking.preferences.seatRules.length === 0)
      setRules(legacy)
  }, [slug, officeSlug, store, setRules])

  return { rules, setRules }
}

/** The next working days you can book, from today. */
export const getDayChoices = (today: Day, lastDay: Day, opening: OfficeOpening) => {
  const days: Day[] = []
  // Before the office's bookings are in, no days yet.
  if (!today || !lastDay) return days

  for (let day = today; day <= lastDay && days.length < DAY_CHOICES; day = addDays(day, 1))
    if (!isWeekend(day) && isOpenDay(day, opening)) days.push(day)

  return days
}

/**
 * Seats that fit your preferences, on a day or on any day — from what the
 * office view already has (every desk on every floor, the bookings,
 * your favourites).
 */
export const useSeatMatches = (rules: SeatRule[]) => {
  const pieces = useAllPieces()
  const bookings = useOfficeStore((state) => state.booking.byDay)
  const released = useOfficeStore((state) => state.booking.released)
  const me = useOfficeStore((state) => state.booking.me)
  const today = useOfficeStore((state) => state.booking.today)
  const lastDay = useOfficeStore((state) => state.booking.lastDay)
  const favorites = useOfficeStore((state) => state.booking.preferences.favorites)
  const opening = useOfficeStore((state) => state.booking.opening)
  const teams = useOfficeStore((state) => state.booking.teams)

  const context: MatchContext | null = useMemo(() => {
    if (!me) return null

    const desks: MatchDesk[] = pieces.filter((piece) => isSeatable(piece.type))

    return { desks, bookings, released, me, favorites, rules, opening, teams, today }
  }, [pieces, bookings, released, me, favorites, rules, opening, teams, today])

  const isResident = !!me && pieces.some((piece) => piece.assignee === me)

  return useMemo(
    () => ({
      isResident,
      dayChoices: getDayChoices(today, lastDay, opening),
      onDay: (day: Day) => (context ? matchDay(context, day) : null),
      anyDay: (limit = ANY_DAY_LIMIT) =>
        context ? matchAnyDay(context, { from: today, to: lastDay, limit }) : [],
    }),
    [context, isResident, today, lastDay, opening]
  )
}

/** Shows a desk on the map, on its day (its floor too). */
export const useShowSeatOnMap = () => {
  const setDay = useOfficeStore((state) => state.setBookingDay)
  const spotlightSeat = useOfficeStore((state) => state.spotlightSeat)

  return useCallback(
    (deskId: string, day: Day) => {
      setDay(day)
      spotlightSeat(deskId)
    },
    [setDay, spotlightSeat]
  )
}
