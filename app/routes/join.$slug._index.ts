import { redirect } from "react-router"
import { Route } from "./+types/join.$slug._index"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request, params: { slug } }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  try {
    const profile = await core.organization.confirmInvite({
      email: user.email,
      organizationSlug: slug,
    })
    // Org pages live under /app (was `/o/…` — a 404 after accepting an invite).
    return redirect(`/app/o/${profile.organizationSlug}`)
  } catch {
    return redirect("/")
  }
}
