// Admin access, from the server (self-hosting): for when nobody who can
// manage the company can sign in any more — the only admin left, or lost
// their account.
//   node server/admin.mjs list-admins
//   node server/admin.mjs make-admin someone@acme.com
// With several companies (the hosted service): --organization <slug>.
// In Docker: docker compose exec hotseat node server/admin.mjs …
import pg from "pg"

const USAGE = `Usage:
  node server/admin.mjs list-admins [--organization <slug>]
  node server/admin.mjs make-admin <email> [--organization <slug>]`

const [command, ...rest] = process.argv.slice(2)
const organizationFlag = rest.indexOf("--organization")
const organizationSlug = organizationFlag === -1 ? null : rest[organizationFlag + 1]
// The email: whatever isn't the --organization flag or its value.
const isOrganizationArgument = (index) =>
  organizationFlag !== -1 && (index === organizationFlag || index === organizationFlag + 1)
const [email] = rest.filter((_, index) => !isOrganizationArgument(index))

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

if (!["list-admins", "make-admin"].includes(command)) fail(USAGE)
if (command === "make-admin" && !/^[^@\s]+@[^@\s]+$/.test(email ?? "")) fail(USAGE)

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

/** The company: the one asked for, or the only one there is. */
const findOrganization = async () => {
  const { rows } = await client.query(`
    SELECT "slug", "name" FROM "Organization" ORDER BY "createdAt"`)
  if (organizationSlug) return rows.find((row) => row.slug === organizationSlug)
  if (rows.length > 1)
    fail(
      `There are several companies: say which with --organization (${rows.map((row) => row.slug).join(", ")}).`
    )

  return rows[0]
}

try {
  const organization = await findOrganization()
  if (!organization) fail("No company here yet: whoever signs in first sets it up.")

  if (command === "list-admins") {
    const { rows } = await client.query(
      `SELECT "userEmail" FROM "Profile" WHERE "organizationSlug" = $1 AND "role" = 'ADMIN'
        ORDER BY "userEmail"`,
      [organization.slug]
    )
    console.log(`Admins of ${organization.name}:`)
    console.log(rows.length ? rows.map((row) => `  ${row.userEmail}`).join("\n") : "  (none)")
  }

  if (command === "make-admin") {
    // Their account: as it is, or a bare one their first sign-in fills in.
    await client.query(
      `INSERT INTO "User" ("email", "displayName", "updatedAt") VALUES ($1, $2, now())
        ON CONFLICT ("email") DO NOTHING`,
      [email, email.split("@")[0]]
    )
    await client.query(
      `INSERT INTO "Profile" ("userEmail", "organizationSlug", "role", "updatedAt")
        VALUES ($1, $2, 'ADMIN', now())
        ON CONFLICT ("userEmail", "organizationSlug") DO UPDATE SET "role" = 'ADMIN', "updatedAt" = now()`,
      [email, organization.slug]
    )
    console.log(`${email} is an admin of ${organization.name}. They sign in as usual.`)
  }
} finally {
  await client.end()
}
