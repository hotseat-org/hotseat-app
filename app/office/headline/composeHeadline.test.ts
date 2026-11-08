/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { composeHeadline, type HeadlineFacts } from "./composeHeadline"
import { cs } from "~/i18n/cs"
import { createTranslator, registerMessages } from "~/i18n/translate"

registerMessages("cs", cs)

const english = createTranslator("en")
const czech = createTranslator("cs")

// Monday 9 November 2026 is the shown day; today is the Saturday before.
const MONDAY: HeadlineFacts = {
  day: "2026-11-09",
  today: "2026-11-07",
  isOpen: true,
  myDay: { kind: "none" },
  freeCount: 14,
  peopleIn: ["Lena", "Max", "Petra", "Anna", "Theo", "Ivy"],
}

describe("the headline", () => {
  test("names the day: today, tomorrow, or its weekday", () => {
    expect(composeHeadline(english, { ...MONDAY, day: "2026-11-07" }).title).toBe("Today.")
    expect(composeHeadline(english, { ...MONDAY, day: "2026-11-08" }).title).toBe("Tomorrow.")
    expect(composeHeadline(english, MONDAY).title).toBe("Monday.")
    expect(composeHeadline(czech, MONDAY).title).toBe("Pondělí.")
  })

  test("without a desk: you, how many are free, then who's in", () => {
    expect(composeHeadline(english, MONDAY).sentences).toEqual([
      "You're not in, yet.",
      "14 desks are free.",
      "Lena, Max and 4 others are in.",
    ])
    expect(composeHeadline(czech, MONDAY).sentences).toEqual([
      "Zatím tu nemáte stůl.",
      "Volných je 14 stolů.",
      "V kanceláři: Lena, Max a 4 další.",
    ])
  })

  test("with a desk, the free count drops out", () => {
    const booked = { ...MONDAY, myDay: { kind: "booked", deskLabel: "D2" } } as const

    expect(composeHeadline(english, booked).sentences).toEqual([
      "You're at D2.",
      "Lena, Max and 4 others are in.",
    ])
    expect(composeHeadline(czech, booked).sentences[0]).toBe("Sedíte u stolu D2.")
  })

  test("counts people and desks in each Czech plural form", () => {
    const few = { ...MONDAY, freeCount: 3, peopleIn: ["Lena", "Max", "Petra"] }
    const one = { ...MONDAY, freeCount: 1, peopleIn: ["Lena"] }

    expect(composeHeadline(czech, few).sentences.slice(1)).toEqual([
      "Volné jsou 3 stoly.",
      "V kanceláři: Lena, Max a 1 další.",
    ])
    expect(composeHeadline(english, one).sentences.slice(1)).toEqual([
      "1 desk is free.",
      "Lena is in.",
    ])
    expect(composeHeadline(english, { ...MONDAY, peopleIn: ["Lena", "Max"] }).sentences[2]).toBe(
      "Lena and Max are in."
    )
  })

  test("a full office, the waitlist, and nobody in", () => {
    const full = { ...MONDAY, freeCount: 0, peopleIn: [] }

    expect(composeHeadline(english, full).sentences).toEqual([
      "The office is full.",
      "Nobody else is in.",
    ])
    expect(
      composeHeadline(english, { ...MONDAY, freeCount: 0, myDay: { kind: "waiting" } }).sentences[0]
    ).toBe("You're on the waitlist.")
  })

  test("a past day speaks in the past, without saying who did what", () => {
    const past = {
      ...MONDAY,
      day: "2026-11-02",
      myDay: { kind: "booked", deskLabel: "D1" },
    } as const

    expect(composeHeadline(english, past).sentences).toEqual([
      "Your desk was D1.",
      "Lena, Max and 4 others were in.",
    ])
    expect(composeHeadline(czech, past).sentences).toEqual([
      "Váš stůl byl D1.",
      "V kanceláři: Lena, Max a 4 další.",
    ])
  })

  test("a closed day says only that", () => {
    expect(composeHeadline(english, { ...MONDAY, isOpen: false }).sentences).toEqual([
      "The office is closed.",
    ])
  })
})
