/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { matchAnyDay, matchDay, type MatchContext, type MatchDesk } from "./matching"
import { ALL_WEEKDAYS } from "~/utils/booking"

const desk = (id: string, x: number, extra: Partial<MatchDesk> = {}): MatchDesk => ({
  id,
  x,
  z: 0,
  label: id,
  ...extra,
})

const MONDAY = "2026-11-02"
const TUESDAY = "2026-11-03"

const createContext = (overrides: Partial<MatchContext> = {}): MatchContext => ({
  desks: [
    desk("D-1", 0, { zone: "Engineering" }),
    desk("D-2", 2, { zone: "Engineering", features: ["monitor"] }),
    desk("D-3", 4, { zone: "Engineering" }),
    desk("D-4", 20, { zone: "Marketing" }),
  ],
  bookings: {},
  released: {},
  me: "me@example.com",
  favorites: [],
  rules: [],
  opening: { openWeekdays: ALL_WEEKDAYS, closedDays: {} },
  teams: [],
  today: MONDAY,
  ...overrides,
})

const labelsOf = (context: MatchContext, day = MONDAY) =>
  matchDay(context, day).matches.map((match) => match.desk.id)

describe("finding a seat", () => {
  test("a must leaves out desks that don't meet it", () => {
    const context = createContext({
      rules: [{ kind: "zone", zone: "Marketing", strength: "must" }],
    })

    expect(labelsOf(context)).toEqual(["D-4"])
  })

  test("a preference ranks desks meeting it first, keeping the rest", () => {
    const context = createContext({
      rules: [{ kind: "feature", feature: "monitor", strength: "prefer" }],
    })

    expect(labelsOf(context)).toEqual(["D-2", "D-1", "D-3", "D-4"])
  })

  test("taken desks and permanent ones aren't offered", () => {
    const context = createContext({
      desks: [...createContext().desks, desk("D-5", 30, { assignee: "eva@example.com" })],
      bookings: { [MONDAY]: { "D-1": "jan@example.com" } },
    })

    expect(labelsOf(context)).toEqual(["D-2", "D-3", "D-4"])
  })

  test("near a colleague: by where they sit that day, closest first", () => {
    const context = createContext({
      bookings: { [MONDAY]: { "D-3": "anna@example.com" } },
      rules: [{ kind: "colleague", email: "anna@example.com", strength: "prefer" }],
    })

    expect(labelsOf(context)).toEqual(["D-2", "D-1", "D-4"])
    expect(matchDay(context, MONDAY).matches[0].met).toHaveLength(1)
    // Not in on Tuesday: nobody to sit near.
    expect(matchDay(context, TUESDAY).matches[0].missed).toHaveLength(1)
  })

  test("away from someone ranks desks near them last", () => {
    const context = createContext({
      bookings: { [MONDAY]: { "D-1": "petr@example.com" } },
      rules: [{ kind: "colleague", email: "petr@example.com", strength: "prefer", isAway: true }],
    })

    expect(labelsOf(context)).toEqual(["D-3", "D-4", "D-2"])
  })

  test("with a desk that day already, nothing is offered", () => {
    const context = createContext({ bookings: { [MONDAY]: { "D-2": "me@example.com" } } })

    expect(matchDay(context, MONDAY)).toMatchObject({ matches: [], current: { id: "D-2" } })
  })

  test("away from a zone ranks desks outside it first", () => {
    const context = createContext({
      rules: [{ kind: "zone", zone: "Engineering", strength: "prefer", isAway: true }],
    })
    const result = matchDay(context, MONDAY)

    expect(result.matches[0]?.desk.id).toBe("D-4")
  })

  test("away from a zone as a must leaves out every desk in it", () => {
    const context = createContext({
      rules: [{ kind: "zone", zone: "Engineering", strength: "must", isAway: true }],
    })

    expect(matchDay(context, MONDAY).matches.map((match) => match.desk.id)).toEqual(["D-4"])
  })

  test("with my team: near those of it who are in, closest to the group first", () => {
    const context = createContext({
      desks: [...createContext().desks, desk("D-5", 22, { zone: "Marketing" })],
      bookings: { [MONDAY]: { "D-1": "anna@example.com", "D-3": "jan@example.com" } },
      teams: [
        {
          id: "design",
          members: ["anna@example.com", "jan@example.com", "me@example.com"],
          zone: null,
          keepDays: null,
        },
      ],
      rules: [{ kind: "team", teamId: "design", strength: "must" }],
    })

    expect(labelsOf(context)).toEqual(["D-2"])
    expect(matchDay(context, MONDAY).matches[0].teammates).toEqual([
      "anna@example.com",
      "jan@example.com",
    ])
  })

  test("with my team: their zone counts, even with nobody in", () => {
    const context = createContext({
      teams: [{ id: "marketing", members: ["me@example.com"], zone: "Marketing", keepDays: null }],
      rules: [{ kind: "team", teamId: "marketing", strength: "must" }],
    })

    expect(labelsOf(context)).toEqual(["D-4"])
  })

  test("a zone kept for a team you're not in isn't offered until shortly before", () => {
    const context = createContext({
      teams: [{ id: "marketing", members: ["eva@example.com"], zone: "Marketing", keepDays: 1 }],
    })

    // Tuesday is within a day: open to all. Wednesday isn't yet.
    expect(labelsOf(context, TUESDAY)).toContain("D-4")
    expect(labelsOf(context, "2026-11-04")).not.toContain("D-4")
  })

  test("any day: days the office is closed aren't offered", () => {
    const context = createContext({
      opening: { openWeekdays: ALL_WEEKDAYS, closedDays: { [MONDAY]: "Holiday" } },
    })
    const found = matchAnyDay(context, { from: MONDAY, to: TUESDAY, limit: 5 })

    expect(found.map((result) => result.day)).toEqual([TUESDAY])
  })

  test("any day: the earliest working days with a desk that fits", () => {
    const context = createContext({
      desks: [desk("D-1", 0, { zone: "Engineering" })],
      bookings: { [MONDAY]: { "D-1": "jan@example.com" } },
      rules: [{ kind: "zone", zone: "Engineering", strength: "must" }],
    })

    const days = matchAnyDay(context, { from: "2026-10-31", to: "2026-11-30", limit: 2 })

    // Saturday, Sunday and the booked Monday skipped.
    expect(days.map((result) => result.day)).toEqual([TUESDAY, "2026-11-04"])
  })
})
