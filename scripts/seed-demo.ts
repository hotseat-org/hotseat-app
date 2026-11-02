/**
 * The demo company (app/core/demo/company.ts) in a local database, at
 * /app/o/fern-and-fox/offices/the-burrow, with Maya as maya.lind@fernfox.demo.test:
 * for screenshots (the product page). Run it again any time: it deletes the
 * demo company first and starts over.
 *
 *   bun run seed:demo
 *
 * Local databases only: it refuses anything but localhost.
 */
import { SQL } from "bun"
import { composeDemoCompany, DEMO_DOMAIN } from "~/core/demo/company"
import { todayIn } from "~/utils/booking"

const ORGANIZATION_SLUG = "fern-and-fox"

const connectionString = process.env.DATABASE_URL ?? ""

if (!/@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)) {
  console.error("seed-demo: DATABASE_URL isn't a local database — refusing.")
  process.exit(1)
}

// Bun's own Postgres client: Prisma's engine doesn't load under Bun, and the
// templates need Bun (they read Vite's import.meta.env).
const sql = new SQL(connectionString)

const seed = async () => {
  const company = composeDemoCompany({
    today: todayIn("Europe/Prague"),
    organizationSlug: ORGANIZATION_SLUG,
    visitorEmail: `maya.lind@${DEMO_DOMAIN}`,
  })
  const { organization, office } = company
  const scope = { organizationSlug: organization.slug, officeSlug: office.slug }
  // As text: Bun sends a Date in a form Postgres can't read.
  const now = new Date().toISOString()

  await sql`DELETE FROM "Organization" WHERE slug = ${organization.slug}`
  await sql`DELETE FROM "User" WHERE email = ${company.people[0].email}`

  const users = company.people.map(({ email, displayName, avatarUrl }) => ({
    email,
    displayName,
    avatarUrl,
    updatedAt: now,
  }))
  const profiles = company.people.map(({ email, role }) => ({
    userEmail: email,
    organizationSlug: organization.slug,
    role,
    favoriteOfficeSlug: office.slug,
    updatedAt: now,
  }))

  await sql`INSERT INTO "User" ${sql(users)} ON CONFLICT (email) DO NOTHING`
  await sql`INSERT INTO "Organization" ${sql({ ...organization, updatedAt: now })}`
  // JSON as text, cast: Bun would send the text as a JSON string.
  await sql`INSERT INTO "Office" (slug, name, "organizationSlug", layout, timezone, "updatedAt")
    VALUES (${office.slug}, ${office.name}, ${organization.slug}, ${JSON.stringify(office.layout)}::text::jsonb, ${office.timezone}, ${now})`
  await sql`INSERT INTO "Profile" ${sql(profiles)}`

  const reservations = company.reservations.map((reservation) => ({
    ...scope,
    ...reservation,
    id: crypto.randomUUID(),
    createdByEmail: reservation.userEmail,
  }))
  const releases = company.releases.map((release) => ({ ...scope, ...release }))

  await sql`INSERT INTO "Reservation" ${sql(reservations)}`
  await sql`INSERT INTO "DeskRelease" ${sql(releases)}`
  await sql`INSERT INTO "SeatRules" ("organizationSlug", "officeSlug", "userEmail", rules, "updatedAt")
    VALUES (${scope.organizationSlug}, ${scope.officeSlug}, ${company.seatRules.userEmail}, ${JSON.stringify(company.seatRules.rules)}::text::jsonb, ${now})`
  await sql`INSERT INTO "FavoriteDesk" ${sql({ ...scope, ...company.favorite })}`

  console.log(
    `seed-demo: ${organization.name}, ${company.people.length} people, ${reservations.length} bookings — /app/o/${organization.slug}/offices/${office.slug}`
  )
}

await seed()
await sql.close()
