// The Node server's run-time packages, at the versions installed: written as a
// package.json for the Docker image to install alone (instead of every
// dependency — the server bundles the rest, see vite.config.ts).
//   node scripts/runtime-packages.mjs runtime/package.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const [target = "runtime/package.json"] = process.argv.slice(2)

/**
 * Loaded from node_modules: by the app (vite.config.ts), by server/node.mjs
 * (node-fetch-server) and by server/migrate.mjs (pg).
 */
const PACKAGES = ["@prisma/client", "@prisma/adapter-pg", "pg", "@remix-run/node-fetch-server"]

const getInstalledVersion = (name) =>
  JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version

const dependencies = Object.fromEntries(PACKAGES.map((name) => [name, getInstalledVersion(name)]))

mkdirSync(dirname(target), { recursive: true })
writeFileSync(
  target,
  `${JSON.stringify({ name: "hotseat-runtime", private: true, type: "module", dependencies }, null, 2)}\n`
)
console.log(
  `${target}: ${Object.entries(dependencies)
    .map(([name, version]) => `${name}@${version}`)
    .join(", ")}`
)
