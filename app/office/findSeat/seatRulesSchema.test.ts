/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { SeatRule } from "./matching"
import { MAX_SEAT_RULES, getDefaultSeatRules, parseSeatRules } from "./seatRulesSchema"

describe("seat rules as kept", () => {
  test("valid ones are kept as they are", () => {
    const rules: SeatRule[] = [
      { kind: "zone", zone: "Marketing", strength: "must" },
      { kind: "colleague", email: "anna@example.com", strength: "prefer" },
      { kind: "favorite", strength: "prefer" },
      { kind: "feature", feature: "standing", strength: "must" },
      { kind: "zone", zone: "Finance", strength: "must", isAway: true },
    ]

    expect(parseSeatRules(rules)).toEqual(rules)
  })

  test("an old avoid rule is read as an away preference (a feature can't be away)", () => {
    const rules = [
      { kind: "colleague", email: "petr@example.com", strength: "avoid" },
      { kind: "zone", zone: "Finance", strength: "avoid" },
      { kind: "feature", feature: "standing", strength: "avoid" },
    ]

    expect(parseSeatRules(rules)).toEqual([
      { kind: "colleague", email: "petr@example.com", strength: "prefer", isAway: true },
      { kind: "zone", zone: "Finance", strength: "prefer", isAway: true },
    ])
  })

  test("anything else is left out: unknown kinds, strengths, missing values", () => {
    const rules = [
      { kind: "zone", zone: "Marketing", strength: "must" },
      { kind: "room", room: "Quiet", strength: "prefer" },
      { kind: "zone", zone: "Finance", strength: "always" },
      { kind: "colleague", strength: "prefer" },
      "zone",
      null,
    ]

    expect(parseSeatRules(rules)).toEqual([{ kind: "zone", zone: "Marketing", strength: "must" }])
  })

  test("not a list, or too many: none, or the first ones", () => {
    const many = Array.from({ length: MAX_SEAT_RULES + 3 }, (_, index) => ({
      kind: "zone",
      zone: `Zone ${index}`,
      strength: "prefer",
    }))

    expect(parseSeatRules({ kind: "zone" })).toEqual([])
    expect(parseSeatRules(many)).toHaveLength(MAX_SEAT_RULES)
  })
})

describe("the rules before anyone chooses", () => {
  const teams = [
    { id: "guild", members: ["me@example.com"], zone: null },
    { id: "design", members: ["me@example.com", "eva@example.com"], zone: "Design corner" },
    { id: "sales", members: ["jan@example.com"], zone: "Sales" },
  ]

  test("in a team: to sit with it — the one with a zone here first", () => {
    expect(getDefaultSeatRules(teams, "me@example.com")).toEqual([
      { kind: "team", teamId: "design", strength: "prefer" },
    ])
  })

  test("in no team: none", () => {
    expect(getDefaultSeatRules(teams, "nobody@example.com")).toEqual([])
  })
})
