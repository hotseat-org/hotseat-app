import type { LoaderFunctionArgs } from "react-router"
import { redirect } from "react-router"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUser(request)

  return redirect("app")
}
