import { count, query } from "./database"
import { demoTest as test, expect } from "./fixtures"

/** Booking a desk, start to end: found, booked, seen in My bookings, cancelled — saved each time. */

const countUpcoming = (slug: string, email: string) =>
  count(
    `select count(*) from "Reservation"
     where "organizationSlug" = $1 and "userEmail" = $2 and date > current_date`,
    [slug, email]
  )

test("find a seat on a coming day, book it, then cancel it", async ({ page, demo }) => {
  // Nothing booked ahead: every coming day offers a seat.
  await query(
    `delete from "Reservation"
     where "organizationSlug" = $1 and "userEmail" = $2 and date > current_date`,
    [demo.slug, demo.visitorEmail]
  )

  await page.goto(`${demo.officePath}/find`, { waitUntil: "networkidle" })
  const findSeat = page.getByRole("dialog", { name: "Find a seat" })
  // The first coming day: tomorrow, or after a weekend the next open one.
  await findSeat
    .getByRole("button", { name: /^(Tomorrow|[A-Z][a-z]{2} \d{1,2})$/ })
    .first()
    .click()
  // Best, or closest when not every preference can be met.
  await expect(findSeat.getByText(/^(Best|Closest) match$/)).toBeVisible()
  await findSeat.getByRole("button", { name: "Book", exact: true }).click()

  await expect.poll(() => countUpcoming(demo.slug, demo.visitorEmail)).toBe(1)

  await page.goto(`${demo.officePath}/bookings`, { waitUntil: "networkidle" })
  const bookings = page.getByRole("dialog").first()
  await bookings.getByRole("button", { name: "Cancel", exact: true }).first().click()
  await bookings.getByRole("button", { name: "Cancel it" }).click()

  await expect.poll(() => countUpcoming(demo.slug, demo.visitorEmail)).toBe(0)
})
