import { type LoaderFunctionArgs } from "react-router"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  const invitations = await core.user.getOrganizationInvites(user.email)

  return { invitations }
}
