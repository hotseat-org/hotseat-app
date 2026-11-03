import { deleteDemo } from "./database"
import { expect, readLanding, setLocale, test, visitorOf } from "./fixtures"

/** The front door, signed out: the product page, signing in and back, Czech, the demo. */

test("from the product page to signing in, and back", async ({ page }) => {
  await page.goto("")
  await page.getByRole("banner").getByRole("link", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole("link", { name: "Back to Hotseat" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your office, minus the musical chairs"
  )
})

test("the product page in Czech, picked at its foot", async ({ page }) => {
  await setLocale(page, "en")
  await page.goto("")
  await page.getByRole("contentinfo").getByRole("button", { name: "Čeština" }).click()

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Kancelář bez honby za volnou židlí"
  )
})

test("looking around a demo office", async ({ page }) => {
  await page.goto("")
  await page.getByRole("button", { name: "Look around a demo office" }).first().click()
  await page.waitForURL(/\/app\/o\/fern-and-fox-[^/]+\/offices\//, { timeout: 30_000 })
  const { slug } = readLanding(page.url())

  try {
    await expect(page.locator("canvas").first()).toBeVisible()
  } finally {
    await deleteDemo({ slug, visitorEmail: visitorOf(slug) })
  }
})

test("the editor without an account: a blank floor, the catalogue", async ({ page }) => {
  await page.goto("office-editor")
  await page.getByRole("button", { name: "Start from a blank floor" }).click()
  await page.getByRole("button", { name: /Games/ }).click()

  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Table football/ })).toBeVisible()
})
