import type { Page } from "@playwright/test"
import { count } from "./database"
import { demoTest as test, expect } from "./fixtures"

/** Editing the office: the catalogue's previews, a piece placed and saved. */

const openGames = async (page: Page, officePath: string) => {
  await page.goto(officePath, { waitUntil: "networkidle" })
  await page.getByRole("button", { name: "Edit layout" }).first().click()
  // Ready to edit: until then, a click on the floor places nothing.
  // (It fades out, so its text stays; hidden from assistive tech once done.)
  await expect(page.getByRole("status").filter({ hasText: "Opening the editor…" })).toHaveCount(0)
  await page.getByRole("button", { name: /Games/ }).first().click()
  await expect(page.getByRole("heading", { name: "Games" })).toBeVisible()
}

test("the catalogue's previews show their pieces", async ({ page, demo }) => {
  await openGames(page, demo.officePath)
  const tile = page.getByRole("button", { name: /Table football/ }).locator("img")
  await expect(tile).toBeVisible()

  // Drawn, not blank: how many of its pixels aren't see-through.
  const drawn = await tile.evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas")
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext("2d")!
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let opaque = 0
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 10) opaque++

    return opaque
  })
  expect(drawn).toBeGreaterThan(200)
})

test("a table football placed and saved", async ({ page, demo }) => {
  const countPlaced = () =>
    count(
      `select count(*) from "Office", jsonb_path_query(layout, '$.pieces[*] ? (@.type == "tableFootball")')
       where "organizationSlug" = $1`,
      [demo.slug]
    )
  const before = await countPlaced()

  await openGames(page, demo.officePath)
  await page.getByRole("button", { name: /Table football/ }).click()
  // Somewhere open on the floor: a few spots, one of them places it.
  const box = (await page
    .getByRole("region", { name: "The office in 3D" })
    .locator("canvas")
    .boundingBox())!
  for (const [x, y] of [
    [0.5, 0.5],
    [0.6, 0.6],
    [0.4, 0.65],
    [0.7, 0.4],
  ]) {
    // Moved there first, as a hand would: the piece follows the pointer before it lands.
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 5 })
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
  }
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Done" }).click()

  await expect.poll(countPlaced).toBeGreaterThan(before)
})
