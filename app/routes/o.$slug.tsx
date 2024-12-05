import { type LoaderFunctionArgs } from "react-router"
import { Outlet, useLoaderData } from "react-router"
import { HeaderOrganization } from "~/components/NavbarOrganization"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"

export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const core = getCore()

  const organization = await core.organization.getForUser({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })

  if (!organization) throw new Response("Not found", { status: 404 })

  return { organization, profile }
}

export default function Index() {
  const { organization, profile } = useLoaderData<typeof loader>()

  return (
    <>
      <HeaderOrganization organization={organization} profile={profile} />
      <Outlet />
    </>
  )
}
