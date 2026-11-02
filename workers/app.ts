import { createRequestHandler } from "react-router"
import { getCore } from "~/core/get-core"
import { runWithPrisma } from "~/services/prisma.server"
import { isHttpsRequest, withSecurityHeaders } from "~/services/securityHeaders"

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
)

export default {
  fetch(request: Request, env: Env) {
    // The basename is `/hotseat/`: the bare path would match no route at all
    const url = new URL(request.url)
    if (url.pathname === "/hotseat") {
      url.pathname = "/hotseat/"
      return Response.redirect(url.toString(), 301)
    }

    return runWithPrisma(env.HYPERDRIVE.connectionString, () => requestHandler(request)).then(
      (response) => withSecurityHeaders(response, isHttpsRequest(request))
    )
  },

  // Hourly (wrangler.jsonc "triggers"): book usual desks on the days that just
  // opened up — offices are in different timezones, so days open at different
  // hours — and hand freed desks to people waiting. And clear demo copies a day old.
  scheduled(_event: unknown, env: Env, ctx: { waitUntil: (work: Promise<unknown>) => void }) {
    ctx.waitUntil(
      runWithPrisma(env.HYPERDRIVE.connectionString, async () => {
        const core = getCore()
        const result = await core.reservation.runJobs()
        console.log("booking jobs", result)

        const demos = await core.demo.clearStale()
        console.log("demo copies cleared", demos)
      })
    )
  },
}
