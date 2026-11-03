import { count } from "./database"
import { demoTest as test, expect } from "./fixtures"

/** Colleagues and teams: finding someone in Who's in, a team made and deleted in Settings. */

test("Who's in finds a colleague by name", async ({ page, demo }) => {
  await page.goto(`${demo.officePath}/people`, { waitUntil: "networkidle" })
  const whosIn = page.getByRole("dialog").first()
  await whosIn.getByRole("searchbox").or(whosIn.getByRole("textbox")).first().fill("Theo")

  await expect(whosIn.getByText("Theo Park").first()).toBeVisible()
})

test("a team made in Settings, then deleted", async ({ page, demo }) => {
  const name = "End-to-end team"
  const countTeams = () =>
    count(
      `select count(*) from "Team"
       where "organizationSlug" = $1 and name = $2`,
      [demo.slug, name]
    )

  // Hydrated first: a click on the server's HTML alone does nothing.
  await page.goto(`${demo.officePath}?settings=org/teams`, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "New team" }).first().click()
  await page.getByRole("textbox").first().fill(name)
  await page
    .getByRole("button", { name: /^(Save|Create team|Create)$/ })
    .first()
    .click()
  await expect.poll(countTeams).toBe(1)

  await page.getByText(name).first().click()
  await page.getByRole("button", { name: "Delete team" }).click()
  await page
    .getByRole("button", { name: /^Delete/ })
    .last()
    .click()
  await expect.poll(countTeams).toBe(0)
})
