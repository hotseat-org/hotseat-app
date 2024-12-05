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
    return redirect(`/o/${profile.organizationSlug}`)
  } catch (e) {
    return redirect("/")
  }
}
