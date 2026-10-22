import type { LoaderFunctionArgs } from "react-router"
import { redirect } from "react-router"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUser(request)

  return redirect("app")
}

// A component, so this isn't a resource route: a client-side navigation here
// would otherwise render nothing (a blank page) instead of following the redirect.
export default () => null
