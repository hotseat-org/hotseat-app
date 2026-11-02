import { useCallback, useMemo, useState } from "react"
import { useParams } from "react-router"
import { isSeatable } from "../catalog"
import { useOfficeStore } from "../store"
import {
  matchAnyDay,
  matchDay,
  type MatchContext,
  type MatchDesk,
  type RuleStrength,
  type SeatRule,
} from "./matching"
import { useAllPieces } from "~/editor"
import { addDays, isWeekend, type Day } from "~/utils/booking"

/** Days shown to pick from (working days, from today). */
const DAY_CHOICES = 5
/** Days "any day" lists at first. */
const ANY_DAY_LIMIT = 5

const STRENGTHS: RuleStrength[] = ["must", "prefer", "avoid"]

/** A stored rule, checked: anything else (an older shape, edited by hand) is dropped. */
const isRule = (value: unknown): value is SeatRule => {
  const rule = value as Partial<SeatRule> & Record<string, unknown>
  if (!rule || !STRENGTHS.includes(rule.strength as RuleStrength)) return false

  if (rule.kind === "zone") return typeof rule.zone === "string"
  if (rule.kind === "colleague") return typeof rule.email === "string"
  if (rule.kind === "feature") return typeof rule.feature === "string"

  return rule.kind === "favorite"
}

/** Where an office's preferences are kept in this browser. */
const getStorageKey = (organization?: string, office?: string) =>
  `hotseat:find-seat:${organization ?? ""}/${office ?? ""}`

const readRules = (key: string): SeatRule[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]")

    return Array.isArray(parsed) ? parsed.filter(isRule) : []
  } catch {
    return []
  }
}

/**
 * Your preferences for this office, kept in this browser (across visits) —
 * set again, they're saved.
 */
export const useSavedRules = () => {
  const { slug, officeSlug } = useParams()
  const key = getStorageKey(slug, officeSlug)
  const [rules, setRulesState] = useState(() => readRules(key))

  const setRules = useCallback(
    (next: SeatRule[]) => {
      setRulesState(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Not kept (private window, storage full): they still apply now.
      }
    },
    [key]
  )

  return { rules, setRules }
}

/** The next working days you can book, from today. */
export const getDayChoices = (today: Day, lastDay: Day) => {
  const days: Day[] = []
  for (let day = today; day <= lastDay && days.length < DAY_CHOICES; day = addDays(day, 1))
    if (!isWeekend(day)) days.push(day)

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

  const context: MatchContext | null = useMemo(() => {
    if (!me) return null

    const desks: MatchDesk[] = pieces.filter((piece) => isSeatable(piece.type))

    return { desks, bookings, released, me, favorites, rules }
  }, [pieces, bookings, released, me, favorites, rules])

  const isResident = !!me && pieces.some((piece) => piece.assignee === me)

  return useMemo(
    () => ({
      isResident,
      dayChoices: getDayChoices(today, lastDay),
      onDay: (day: Day) => (context ? matchDay(context, day) : null),
      anyDay: (limit = ANY_DAY_LIMIT) =>
        context ? matchAnyDay(context, { from: today, to: lastDay, limit }) : [],
    }),
    [context, isResident, today, lastDay]
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
