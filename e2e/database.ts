import "dotenv/config"
import pg from "pg"

/**
 * The local database, for what a test checks behind the screen (a booking
 * saved, a team gone) and to delete the demo companies it started.
 */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 })

/** One query: its rows. */
export const query = async <Row extends Record<string, unknown>>(
  text: string,
  values: unknown[] = []
) => (await pool.query<Row>(text, values)).rows

/** A count, as a number. */
export const count = async (text: string, values: unknown[] = []) => {
  const [row] = await query<{ count: string }>(text, values)

  return Number(row.count)
}

/** A demo company and its visitor, gone (everything in the company goes with it). */
export const deleteDemo = async ({
  slug,
  visitorEmail,
}: {
  slug: string
  visitorEmail: string
}) => {
  await query(
    `delete from "Organization"
     where slug = $1`,
    [slug]
  )
  await query(
    `delete from "User"
     where email = $1`,
    [visitorEmail]
  )
}
