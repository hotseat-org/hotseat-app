import { createRequestHandler } from "react-router"
import { runWithPrisma } from "~/services/prisma.server"

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

    return runWithPrisma(env.HYPERDRIVE.connectionString, () => requestHandler(request))
  },
}
