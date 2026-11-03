import { demoTest as test, expect } from "./fixtures"

/** On a phone: the office's plan, finding a seat, the bookings. */

test("the office, Find a seat and My bookings on a phone", async ({ page, demo }) => {
  await page.goto(demo.officePath)
  await expect(page.getByRole("button", { name: /Find a seat/ }).first()).toBeVisible()

  await page.goto(`${demo.officePath}/find`)
  await expect(page.getByText(/^(Best|Closest) match$/)).toBeVisible()

  await page.goto(`${demo.officePath}/bookings`)
  await expect(page.getByRole("dialog").first()).toBeVisible()
})
