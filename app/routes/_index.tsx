import type { LoaderFunctionArgs } from "react-router"
import { redirect } from "react-router"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)
  // Straight to their office — one redirect, not a chain through every layout.
  return redirect(await getCore().user.landing(user.email))
}

// A component, so this isn't a resource route: a client-side navigation here
// would otherwise render nothing (a blank page) instead of following the redirect.
export default () => null
