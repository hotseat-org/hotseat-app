// Workers static assets are matched by URL path, and the app is served under
// /hotseat/ (vite `base`), so the client build must live in build/client/hotseat.
import { mkdirSync, readdirSync, renameSync } from "node:fs"
import { join } from "node:path"

const clientDirectory = "build/client"
const basePath = "hotseat"
const nestedDirectory = join(clientDirectory, basePath)

mkdirSync(nestedDirectory, { recursive: true })
for (const entry of readdirSync(clientDirectory)) {
  if (entry !== basePath) renameSync(join(clientDirectory, entry), join(nestedDirectory, entry))
}
