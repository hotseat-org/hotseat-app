// Brings the database up to date on start (self-hosting): applies the
// migrations in prisma/migrations not applied yet, oldest first — the work of
// `prisma migrate deploy`, without the Prisma CLI and its migration engine in
// the image. It keeps Prisma's own record (_prisma_migrations, same columns and
// checksums), so the Prisma CLI still reads the database as up to date.
//   DATABASE_URL=postgres://… node server/migrate.mjs [migrations folder]
import { createHash, randomUUID } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import pg from "pg"

const MIGRATIONS_DIR = process.argv[2] ?? "prisma/migrations"
// The lock Prisma's own migrations take: never two at once (several containers starting).
const LOCK_ID = 72707369

const RECORD_TABLE = `
  CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`

/** The migrations on disk, oldest first: name, SQL and its checksum (Prisma's: SHA-256). */
const readMigrations = async () => {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(MIGRATIONS_DIR, name, "migration.sql"), "utf8")

      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") }
    })
  )
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  await client.query("SELECT pg_advisory_lock($1)", [LOCK_ID])
  await client.query(RECORD_TABLE)

  const { rows } = await client.query(`
    SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"`)
  // One that started and never finished: someone must look at it (as Prisma insists).
  const failed = rows.find((row) => !row.finished_at && !row.rolled_back_at)
  if (failed)
    throw new Error(
      `Migration ${failed.migration_name} failed earlier and needs fixing by hand (see SELF_HOSTING.md).`
    )

  const applied = new Set(rows.filter((row) => row.finished_at).map((row) => row.migration_name))
  const pending = (await readMigrations()).filter((migration) => !applied.has(migration.name))

  for (const migration of pending) {
    // Each in a transaction: all of it, or none.
    await client.query("BEGIN")
    try {
      await client.query(migration.sql)
      await client.query(
        `INSERT INTO "_prisma_migrations"
          ("id", "checksum", "migration_name", "started_at", "finished_at", "applied_steps_count")
          VALUES ($1, $2, $3, now(), now(), 1)`,
        [randomUUID(), migration.checksum, migration.name]
      )
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw new Error(`Migration ${migration.name} failed: ${error.message}`, { cause: error })
    }
    console.log(`Applied ${migration.name}`)
  }

  console.log(
    pending.length ? `${pending.length} migrations applied.` : "The database is up to date."
  )
} finally {
  await client.end()
}
