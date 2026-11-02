import { createRequestHandler } from "react-router"
import { getCore } from "~/core/get-core"
import { createPrismaClient, runWithClient } from "~/services/prisma.server"

/**
 * The app for a plain Node server (self-hosting; built with HOTSEAT_TARGET=node
 * — see vite.config.ts, served by server/node.mjs). What workers/app.ts is on
 * Cloudflare: requests, and the hourly booking jobs.
 */
const handleAppRequest = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
)

// One client for the server's life: its connection pool is shared by every request.
const prisma = createPrismaClient(process.env.DATABASE_URL ?? "")

/** Where the app is served (BASE_PATH at build time), e.g. "/" or "/hotseat/". */
export const basePath = import.meta.env.BASE_URL

export const handleRequest = (request: Request) =>
  runWithClient(prisma, () => handleAppRequest(request))

/** Book usual desks on the days that just opened up, and hand freed desks to people waiting. */
export const runHourlyJobs = () =>
  runWithClient(prisma, async () => {
    const result = await getCore().reservation.runJobs()
    console.log("booking jobs", result)
  })
