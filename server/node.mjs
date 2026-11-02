// Hotseat on a plain Node server (self-hosting): the built app's static files,
// everything else to the app, and its hourly jobs on a timer.
//   HOTSEAT_TARGET=node bun run build && node server/node.mjs
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequestListener } from "@remix-run/node-fetch-server"

const { SECURITY_HEADERS, basePath, handleRequest, isHealthy, runHourlyJobs } =
  await import("../build/server/index.js")

const PORT = Number(process.env.PORT ?? 3000)
const CLIENT_DIR = fileURLToPath(new URL("../build/client/", import.meta.url))
const HOUR = 60 * 60 * 1000

const TYPES = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
}

/** A built file for this path, if there is one (never outside the client folder). */
const findStaticFile = async (pathname) => {
  if (!pathname.startsWith(basePath)) return null

  const relative = normalize(decodeURIComponent(pathname.slice(basePath.length)))
  if (relative.startsWith("..") || relative === "." || relative.endsWith("/")) return null

  const path = join(CLIENT_DIR, relative)
  const stats = await stat(path).catch(() => null)

  return stats?.isFile() ? { path, size: stats.size } : null
}

const appListener = createRequestListener(handleRequest)

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost")

  // Health (Docker, load balancers, monitoring): up, and the database answers.
  // At the root as well as under the base path, so probes needn't know it.
  if (pathname === "/healthz" || pathname === `${basePath}healthz`) {
    const isUp = await isHealthy()
    response
      .writeHead(isUp ? 200 : 503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      })
      .end(JSON.stringify({ status: isUp ? "ok" : "database unreachable" }))

    return
  }

  // The bare base path ("/hotseat") → with its slash, where the app is.
  if (basePath !== "/" && pathname === basePath.slice(0, -1)) {
    response.writeHead(301, { Location: basePath }).end()
    return
  }

  const file =
    request.method === "GET" || request.method === "HEAD" ? await findStaticFile(pathname) : null
  if (!file) return appListener(request, response)

  // Hashed build assets never change; the rest (images, icons) for an hour.
  const isHashed = pathname.startsWith(`${basePath}assets/`)
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": TYPES[extname(file.path).toLowerCase()] ?? "application/octet-stream",
    "Content-Length": file.size,
    "Cache-Control": isHashed ? "public, max-age=31536000, immutable" : "public, max-age=3600",
  })
  if (request.method === "HEAD") return response.end()

  createReadStream(file.path).pipe(response)
})

server.listen(PORT, () => console.log(`Hotseat on http://localhost:${PORT}${basePath}`))

// Hourly, a minute after starting first (what Cloudflare's cron does for the hosted one).
const runJobs = () => runHourlyJobs().catch((error) => console.error("booking jobs failed", error))
setTimeout(runJobs, 60 * 1000)
setInterval(runJobs, HOUR)

// Stop cleanly (docker stop): finish what's in flight, then exit.
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => server.close(() => process.exit(0)))
