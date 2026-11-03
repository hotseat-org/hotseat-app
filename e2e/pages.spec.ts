import type { Page } from "@playwright/test"
import { demoTest, expect, setLocale, test, type Demo } from "./fixtures"

/**
 * Every page, signed out and signed in, in English and Czech (on a desktop
 * and a phone — see the config's projects): it answers, shows no error
 * screen, logs no errors and doesn't scroll sideways.
 */

const SIGNED_OUT = [
  "",
  "login",
  "docs/self-hosting",
  "docs/self-hosting/installation",
  "docs/self-hosting/configuration",
  "docs/self-hosting/sign-in",
  "docs/self-hosting/administration",
  "docs/self-hosting/operations",
  "office-editor",
  "app",
  "join/no-such-org",
]

/** Signed in: the demo's office, its panels and settings, and the rest of the app. */
const getSignedIn = ({ slug, officePath }: Demo) => [
  "",
  "app",
  `app/o/${slug}`,
  `app/o/${slug}/offices`,
  `app/o/${slug}/offices/new`,
  officePath,
  ...["bookings", "find", "insights", "people"].map((panel) => `${officePath}/${panel}`),
  ...["general", "opening", "danger"].map((section) => `${officePath}/settings/${section}`),
  ...["profile", "organizations", "invitations", "danger"].map(
    (section) => `${officePath}?settings=user/${section}`
  ),
  ...["general", "members", "teams", "invitations", "danger"].map(
    (section) => `${officePath}?settings=org/${section}`
  ),
]

/** Not there: a not-found page, not an error (Chrome logs the 404 itself). */
const NOT_FOUND = ["no-such-page"]
const getNotFoundSignedIn = ({ slug }: Demo) => [
  "app/o/no-such-org",
  `app/o/${slug}/offices/no-such-office`,
]
const NOT_FOUND_ERROR = /status of 404/

const ERROR_SCREEN = /Something went wrong|Něco se pokazilo|failed to load|se nepodařilo načíst/i

/** A page, opened and given time to settle: what it answered. */
const open = async (page: Page, path: string) => {
  const response = await page.goto(path, { waitUntil: "networkidle" })
  // An office draws its 3D view after the network quietens.
  await page.waitForTimeout(/offices\/[^/?]+($|\?|\/)/.test(path) ? 2500 : 500)

  return response?.status() ?? 0
}

const expectWhole = async (page: Page) => {
  await expect(page.getByText(ERROR_SCREEN)).toHaveCount(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  expect(overflow, "sideways scroll (px)").toBeLessThanOrEqual(1)
}

for (const locale of ["en", "cs"] as const) {
  test.describe(`signed out, ${locale}`, () => {
    for (const path of SIGNED_OUT)
      test(`/${path}`, async ({ page }) => {
        await setLocale(page, locale)

        expect(await open(page, path)).toBeLessThan(400)
        await expectWhole(page)
      })

    test.describe("not found", () => {
      test.use({ allowedErrors: [NOT_FOUND_ERROR] })

      for (const path of NOT_FOUND)
        test(`/${path}`, async ({ page }) => {
          await setLocale(page, locale)

          expect(await open(page, path)).toBe(404)
          await expectWhole(page)
        })
    })
  })

  demoTest.describe(`signed in, ${locale}`, () => {
    demoTest("every page", async ({ page, demo }) => {
      // Two dozen pages, a few seconds each.
      demoTest.setTimeout(240_000)
      await setLocale(page, locale)

      for (const path of getSignedIn(demo)) {
        await demoTest.step(`/${path}`, async () => {
          expect(await open(page, path)).toBeLessThan(400)
          await expectWhole(page)
        })
      }
    })

    demoTest.describe("not found", () => {
      demoTest.use({ allowedErrors: [NOT_FOUND_ERROR] })

      demoTest("a company or office that isn't there", async ({ page, demo }) => {
        await setLocale(page, locale)

        for (const path of getNotFoundSignedIn(demo)) {
          expect(await open(page, path)).toBe(404)
          await expectWhole(page)
        }
      })
    })
  })
}
