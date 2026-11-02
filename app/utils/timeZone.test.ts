/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { formatTimeZone, getTimeZoneOffset, isTimeZone, listTimeZones } from "./timeZone"

describe("isTimeZone", () => {
  test("knows real zones and refuses the rest", () => {
    expect(isTimeZone("Europe/Prague")).toBe(true)
    expect(isTimeZone("America/New_York")).toBe(true)
    expect(isTimeZone("UTC")).toBe(true)
    expect(isTimeZone("Mars/Olympus")).toBe(false)
    expect(isTimeZone("")).toBe(false)
    expect(isTimeZone(null)).toBe(false)
  })
})

describe("listTimeZones", () => {
  test("lists them all, with UTC, each one valid", () => {
    const zones = listTimeZones()

    expect(zones.length).toBeGreaterThan(300)
    expect(zones).toContain("UTC")
    expect(zones).toContain("Europe/Prague")
    expect(zones.every(isTimeZone)).toBe(true)
  })
})

describe("getTimeZoneOffset", () => {
  test("says the offset at that moment, summer time included", () => {
    expect(getTimeZoneOffset("Europe/Prague", new Date("2026-01-15T12:00:00Z"))).toBe("GMT+1")
    expect(getTimeZoneOffset("Europe/Prague", new Date("2026-07-15T12:00:00Z"))).toBe("GMT+2")
    // "GMT" in browsers, "GMT+0" in some runtimes.
    expect(getTimeZoneOffset("UTC", new Date("2026-07-15T12:00:00Z"))).toMatch(/^GMT(\+0)?$/)
  })
})

describe("formatTimeZone", () => {
  test("reads like words", () => {
    expect(formatTimeZone("America/New_York")).toBe("America / New York")
  })
})
