import type { LoaderFunctionArgs } from "@vercel/remix"
import { redirect } from "@vercel/remix"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await requireUser(request)

  return redirect("app")
}
