import { redirect, type ActionFunctionArgs } from "react-router"
import { isDemoVisitor } from "~/core/demo"
import { getCore } from "~/core/get-core"
import { requireSaas } from "~/edition/edition.server"
import { isAuthenticated, sessionStorage } from "~/services/session.server"

// Only a button's POST starts a demo: link previews and crawlers (GET) never do.
export const loader = () => redirect("/")

/**
 * "Look around a demo office": the visitor's own copy of the demo company,
 * signed in as its Maya. Someone signed in already keeps their session (a
 * demo visitor goes back to their copy while it lasts).
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  requireSaas()

  const core = getCore()
  const user = await isAuthenticated(request)

  if (user) {
    const landing = await core.user.landing(user.email)
    const hasCopy = landing !== "/app"
    if (!isDemoVisitor(user.email) || hasCopy) return redirect(landing)
  }

  const visitor = await core.demo.start()
  const session = await sessionStorage.getSession(request.headers.get("cookie"))

  session.set("user", visitor)

  return redirect(await core.user.landing(visitor.email), {
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  })
}
