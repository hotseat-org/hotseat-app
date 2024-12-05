import { redirect } from "react-router"
import { Route } from "./+types/app._index"
import { Container } from "~/components/Container"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: Route.LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()
  const [firstOrganization] = await core.user.getOrganizations(user.email)

  if (firstOrganization) {
    return redirect(`/o/${firstOrganization.slug}`)
  }

  return null
}

const AppIndex = () => {
  return <Container>Welcome to HotSeat. Create an organization!</Container>
}

export default AppIndex
