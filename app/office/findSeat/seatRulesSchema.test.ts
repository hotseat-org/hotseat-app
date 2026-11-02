/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { SeatRule } from "./matching"
import { MAX_SEAT_RULES, parseSeatRules } from "./seatRulesSchema"

describe("seat rules as kept", () => {
  test("valid ones are kept as they are", () => {
    const rules: SeatRule[] = [
      { kind: "zone", zone: "Marketing", strength: "must" },
      { kind: "colleague", email: "anna@example.com", strength: "prefer" },
      { kind: "favorite", strength: "prefer" },
      { kind: "feature", feature: "standing", strength: "avoid" },
    ]

    expect(parseSeatRules(rules)).toEqual(rules)
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
