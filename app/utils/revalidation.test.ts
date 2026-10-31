/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { ShouldRevalidateFunctionArgs } from "react-router"
import { BOOKING_ACTIONS, NOTIFICATION_ACTIONS, revalidateOn } from "./revalidation"

const office = "https://example.com/hotseat/app/o/acme/offices/hq"
const submitting = (formAction: string) =>
  ({
    currentUrl: new URL(office),
    nextUrl: new URL(office),
    currentParams: { slug: "acme", officeSlug: "hq" },
    nextParams: { slug: "acme", officeSlug: "hq" },
    formMethod: "POST",
    formAction,
    defaultShouldRevalidate: true,
  }) as unknown as ShouldRevalidateFunctionArgs

describe("after an action", () => {
  const organization = revalidateOn({ params: ["slug"], unaffectedBy: [BOOKING_ACTIONS] })
  const officePage = revalidateOn({
    params: ["slug", "officeSlug"],
    unaffectedBy: [NOTIFICATION_ACTIONS],
  })

  test("a booking leaves the organization's data as it is", () => {
    expect(organization(submitting("/hotseat/api/reservations/acme/hq"))).toBe(false)
  })

  test("but reloads the office's", () => {
    expect(officePage(submitting("/hotseat/api/reservations/acme/hq"))).toBe(true)
  })

  test("any other action reloads as usual", () => {
    expect(organization(submitting("/hotseat/api/settings/org/acme/general"))).toBe(true)
    expect(officePage(submitting("/hotseat/api/notifications"))).toBe(false)
  })
})
