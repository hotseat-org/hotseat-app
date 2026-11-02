/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { getKeepingTeam, getOpensToEveryoneOn, toOfficeTeam, type Team } from "./teams"

const MONDAY = "2026-11-02"

const design: Team = {
  id: "design",
  name: "Design",
  color: "teal",
  weekdays: [2, 4],
  members: ["eva@example.com"],
  zones: [
    { officeSlug: "davion", zone: "Design corner", keepDays: 2 },
    { officeSlug: "brno", zone: "Studio", keepDays: null },
  ],
}

describe("a team in an office", () => {
  test("has its zone there, if any", () => {
    expect(toOfficeTeam(design, "davion")).toMatchObject({ zone: "Design corner", keepDays: 2 })
    expect(toOfficeTeam(design, "prague")).toMatchObject({ zone: null, keepDays: null })
  })
})

describe("a zone kept for its team", () => {
  const teams = [toOfficeTeam(design, "davion")]
  const keptFor = (email: string, day: string, zone = "Design corner") =>
    getKeepingTeam(teams, { zone, day, today: MONDAY, email })

  test("is kept from others until its days before", () => {
    // Two days before: Wednesday opens on Monday, Thursday doesn't yet.
    expect(keptFor("jan@example.com", "2026-11-04")).toBeNull()
    expect(keptFor("jan@example.com", "2026-11-05")?.id).toBe("design")
  })

  test("is never kept from its own people, nor are other zones", () => {
    expect(keptFor("eva@example.com", "2026-11-05")).toBeNull()
    expect(keptFor("jan@example.com", "2026-11-05", "Marketing")).toBeNull()
  })

  test("opens to everyone its days before the day", () => {
    expect(getOpensToEveryoneOn({ keepDays: 2 }, "2026-11-05")).toBe("2026-11-03")
  })

  test("not kept, a zone is open any time", () => {
    const open = [toOfficeTeam(design, "brno")]

    expect(
      getKeepingTeam(open, { zone: "Studio", day: "2026-11-13", today: MONDAY, email: "jan@x" })
    ).toBeNull()
  })
})
