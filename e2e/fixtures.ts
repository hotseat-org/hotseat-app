import { test as base, expect, type BrowserContext, type Page } from "@playwright/test"
import { deleteDemo } from "./database"

/** A copy of the demo company, signed in as its visitor (an admin). */
export interface Demo {
  slug: string
  visitorEmail: string
  /** The office the visitor lands in, from the base URL (no leading slash). */
  officePath: string
  storageState: Awaited<ReturnType<BrowserContext["storageState"]>>
}

/** From a landing address (/hotseat/app/o/<slug>/offices/<office>): the company and its office. */
export const readLanding = (address: string) => {
  const match = /app\/o\/([^/]+)\/offices\/([^/?#]+)/.exec(address)
  if (!match) throw new Error(`Not an office's address: ${address}`)

  const [, slug, office] = match

  return { slug, officePath: `app/o/${slug}/offices/${office}` }
}

/** The demo company's visitor, by its company (see core/demo). */
export const visitorOf = (slug: string) =>
  `visitor-${slug.replace("fern-and-fox-", "")}@fernfox.demo.test`

/** Console errors a page may show without failing its test (a not-found page's own 404). */
const isAllowed = (text: string, allowed: RegExp[]) => allowed.some((pattern) => pattern.test(text))

export const test = base.extend<
  {
    /** Console errors this test expects (none, unless it says). */
    allowedErrors: RegExp[]
    /** Fails the test on any page error or console error not allowed. */
    failOnErrors: void
  },
  { demo: Demo }
>({
  allowedErrors: [[], { option: true }],
  failOnErrors: [
    async ({ page, allowedErrors }, use) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(`page error: ${error.message}`))
      page.on("console", (message) => {
        if (message.type() !== "error" || isAllowed(message.text(), allowedErrors)) return

        errors.push(`console: ${message.text()}`)
      })

      await use()

      expect(errors, "errors on the page").toEqual([])
    },
    { auto: true },
  ],
  demo: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
      })
      // A button's POST starts one, and signs the visitor in.
      const response = await request.post("demo", { maxRedirects: 0 })
      const landing = response.headers().location
      if (!landing) throw new Error(`No demo started (${response.status()})`)

      const { slug, officePath } = readLanding(landing)
      const demo = {
        slug,
        visitorEmail: visitorOf(slug),
        officePath,
        storageState: await request.storageState(),
      }

      await use(demo)

      await deleteDemo(demo)
      await request.dispose()
    },
    { scope: "worker" },
  ],
})

/** Signed in to this worker's demo company. */
export const demoTest = test.extend({
  storageState: async ({ demo }, use) => use(demo.storageState),
})

/** The app in a language, for the rest of the test. */
export const setLocale = async (page: Page, locale: "en" | "cs") => {
  await page.request.post("api/set-locale", { data: { locale } })
}

export { expect }
