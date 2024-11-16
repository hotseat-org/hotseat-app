import { LoaderFunctionArgs, redirect } from "@vercel/remix"
import { Container } from "~/components/Container"
import { getCore } from "~/core/get-core"
import { requireUser } from "~/services/session.server"

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
