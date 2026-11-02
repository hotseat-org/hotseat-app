// Applies pending migrations to the production database — the one the
// worker's Hyperdrive connects to. Where it is (host, port, database, user)
// comes from Cloudflare (`wrangler hyperdrive get`); Cloudflare never hands
// out the password, so that comes from PRODUCTION_DATABASE_PASSWORD or, on a
// Mac, the keychain (stored once, see below). Nothing is written to disk.
import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"

/** The keychain item holding the production database's password. */
const KEYCHAIN_SERVICE = "hotseat-production-db"
const PRISMA_CONFIG = "./app/repositories/main-repository/prisma/prisma.config.ts"

const fail = (message) => {
  console.error(`\n${message}\n`)
  process.exit(1)
}

/** The worker's Hyperdrive id, from wrangler.jsonc (comments allowed there). */
const getHyperdriveId = () => {
  const config = readFileSync("wrangler.jsonc", "utf8").replace(/^\s*\/\/.*$/gm, "")
  const id = config.match(/"hyperdrive"\s*:\s*\[\s*\{[^}]*"id"\s*:\s*"([^"]+)"/)?.[1]
  if (!id) fail("No Hyperdrive id in wrangler.jsonc.")

  return id
}

/** Where Hyperdrive connects to: the production database (without its password). */
const getOrigin = (hyperdriveId) => {
  const output = execFileSync("npx", ["wrangler", "hyperdrive", "get", hyperdriveId], {
    encoding: "utf8",
  })
  const origin = JSON.parse(output.slice(output.indexOf("{"))).origin
  if (!origin?.host || !origin.database || !origin.user)
    fail("Cloudflare didn't say where the database is (is wrangler logged in?).")

  return origin
}

/** The password: from the environment, else the keychain (macOS). */
const getPassword = (user) => {
  if (process.env.PRODUCTION_DATABASE_PASSWORD) return process.env.PRODUCTION_DATABASE_PASSWORD

  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", user, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim()
  } catch {
    fail(
      [
        "The production database's password isn't in the keychain yet. Store it once:",
        `  security add-generic-password -s ${KEYCHAIN_SERVICE} -a ${user} -w`,
        "(it asks for the password; or set PRODUCTION_DATABASE_PASSWORD for one run).",
      ].join("\n")
    )
  }
}

const origin = getOrigin(getHyperdriveId())
const password = getPassword(origin.user)
const url = new URL(`postgresql://${origin.host}:${origin.port ?? 5432}/${origin.database}`)
url.username = origin.user
url.password = password
url.searchParams.set("sslmode", "require")

console.log(`Migrating ${origin.database} on ${origin.host} (as ${origin.user})…\n`)
const result = spawnSync(
  "bunx",
  ["prisma", "migrate", "deploy", `--config=${PRISMA_CONFIG}`],
  // Prisma's config loads .env too, but doesn't override what's set here.
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: url.toString() } }
)
process.exit(result.status ?? 1)
