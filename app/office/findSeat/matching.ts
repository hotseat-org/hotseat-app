import {
  addDays,
  deskState,
  isOpenDay,
  isWeekend,
  type BookingsByDay,
  type Day,
  type OfficeOpening,
} from "~/utils/booking"

/**
 * Finding someone a seat by what they'd like: each preference is a rule with
 * how much it matters — a desk must meet it, should (meeting it ranks the desk
 * higher), or should not. Plain data in, plain data out: no React, no
 * browser, so the same rules can be matched on the server one day (repeats,
 * booking it for you as desks free up).
 */

/** How much a rule matters: must be met, or ranks higher when met. */
export type RuleStrength = "must" | "prefer"

/**
 * What a rule asks for. New kinds slot in here, in `isMet`, and in the rule
 * picker. A zone or a colleague can be asked for the other way round
 * (`isAway`): outside the zone, away from them — a must or a preference too.
 */
export type SeatRule =
  | { kind: "zone"; zone: string; strength: RuleStrength; isAway?: boolean }
  | { kind: "favorite"; strength: RuleStrength }
  | { kind: "colleague"; email: string; strength: RuleStrength; isAway?: boolean }
  | { kind: "feature"; feature: string; strength: RuleStrength }

/** Whether a rule keeps you away (from a zone, from someone). */
export const isAwayRule = (rule: SeatRule) => "isAway" in rule && rule.isAway === true

/** A desk as matching needs it (a SceneObject's fields). */
export interface MatchDesk {
  id: string
  x: number
  z: number
  floor?: string
  label?: string
  zone?: string
  features?: string[]
  assignee?: string
}

export interface SeatMatch {
  desk: MatchDesk
  day: Day
  /** The rules it meets — for an avoided one, that it stays clear of it. */
  met: SeatRule[]
  missed: SeatRule[]
}

/** One day's outcome: the desks that fit, best first — or the desk you already have. */
export interface DayMatches {
  day: Day
  matches: SeatMatch[]
  /** Your desk that day already (booked, or your permanent one): nothing to find. */
  current: MatchDesk | null
}

export interface MatchContext {
  desks: MatchDesk[]
  bookings: BookingsByDay
  released: BookingsByDay
  me: string
  favorites: string[]
  rules: SeatRule[]
  /** When the office is open: other days aren't offered. */
  opening: OfficeOpening
}

/** Near enough to a colleague (m, on the same floor): a desk or two away. */
export const NEAR_COLLEAGUE = 3.5

const distanceBetween = (first: MatchDesk, second: MatchDesk) =>
  first.floor === second.floor ? Math.hypot(first.x - second.x, first.z - second.z) : Infinity

/** Who has each desk on a day, and each person's desk. */
const getDayState = (context: MatchContext, day: Day) => {
  const deskOf = new Map<string, MatchDesk>()
  const freeDesks: MatchDesk[] = []

  for (const desk of context.desks) {
    const state = deskState(desk, day, context.bookings, context.released)
    if (state.kind === "free") freeDesks.push(desk)
    else deskOf.set(state.email, desk)
  }

  return { deskOf, freeDesks }
}

/** A day's matching: the context, and each person's desk that day. */
interface DayScope {
  context: MatchContext
  deskOf: Map<string, MatchDesk>
}

/** Whether a desk is what the rule asks for (for an avoided rule: what it stays clear of). */
const isWhatRuleAsks = (rule: SeatRule, desk: MatchDesk, { context, deskOf }: DayScope) => {
  if (rule.kind === "zone") return desk.zone === rule.zone
  if (rule.kind === "favorite") return context.favorites.includes(desk.id)
  if (rule.kind === "feature") return !!desk.features?.includes(rule.feature)

  const colleagueDesk = deskOf.get(rule.email)

  return !!colleagueDesk && distanceBetween(desk, colleagueDesk) <= NEAR_COLLEAGUE
}

/** How a rule went for a desk: met (an avoided one: kept clear of) or not. */
const isMet = (rule: SeatRule, desk: MatchDesk, scope: DayScope) => {
  const isAsked = isWhatRuleAsks(rule, desk, scope)

  return isAwayRule(rule) ? !isAsked : isAsked
}

/** How far a desk is from the colleagues it should be near (m, summed): closer ranks higher. */
const getColleagueDistance = (desk: MatchDesk, rules: SeatRule[], deskOf: Map<string, MatchDesk>) =>
  rules.reduce((sum, rule) => {
    if (rule.kind !== "colleague" || isAwayRule(rule)) return sum

    const colleagueDesk = deskOf.get(rule.email)

    return colleagueDesk ? sum + Math.min(distanceBetween(desk, colleagueDesk), 100) : sum
  }, 0)

/** The free desks that fit a day, best first. */
export const matchDay = (context: MatchContext, day: Day): DayMatches => {
  const { deskOf, freeDesks } = getDayState(context, day)
  const current = deskOf.get(context.me) ?? null
  // A permanent desk elsewhere is yours every day: nothing to book.
  const isResident = context.desks.some((desk) => desk.assignee === context.me)
  if (current || isResident) return { day, matches: [], current }

  const scope = { context, deskOf }
  const ranked = freeDesks
    .map((desk) => {
      const met = context.rules.filter((rule) => isMet(rule, desk, scope))
      const missed = context.rules.filter((rule) => !met.includes(rule))

      return { desk, day, met, missed, distance: getColleagueDistance(desk, context.rules, deskOf) }
    })
    .filter(({ missed }) => !missed.some((rule) => rule.strength === "must"))
    .sort(
      (first, second) =>
        second.met.length - first.met.length ||
        first.distance - second.distance ||
        (first.desk.label ?? "").localeCompare(second.desk.label ?? "", undefined, {
          numeric: true,
        })
    )

  return {
    day,
    matches: ranked.map(({ desk, met, missed }) => ({ desk, day, met, missed })),
    current,
  }
}

/** Whether a match meets every rule. */
export const isPerfect = (match: SeatMatch) => match.missed.length === 0

/**
 * "I don't mind when": the working days from `from` to `to` that have a desk
 * that fits (and you have none yet), earliest first; at most `limit`.
 */
export const matchAnyDay = (
  context: MatchContext,
  { from, to, limit }: { from: Day; to: Day; limit: number }
): DayMatches[] => {
  const found: DayMatches[] = []

  for (let day = from; day <= to && found.length < limit; day = addDays(day, 1)) {
    if (isWeekend(day) || !isOpenDay(day, context.opening)) continue

    const result = matchDay(context, day)
    if (result.matches.length > 0) found.push(result)
  }

  return found
}
