import { Outlet, useSearchParams, type LoaderFunctionArgs } from "react-router"
import NewOffice from "./app.o.$slug.offices.new"
import { getCore } from "~/core/get-core"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { loadOrgSettings } from "~/utils/loader-helpers/settings.server"
import { revalidateOn } from "~/utils/revalidation"

// Org-scoped data for the whole subtree (read via useOrganizationContext /
// useProfile). The old colored org rail lived here — navigation now floats in
// the office shell (WorkspaceSwitcher / AccountMenu), so this is a pass-through.
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const core = getCore()

  const organization = await core.organization.getForUser({
    userEmail: profile.userEmail,
    slug: profile.organizationSlug,
  })
  const organizations = await core.user.getOrganizations(profile.userEmail)

  if (!organization) throw new Response("Not found", { status: 404 })

  // Organization settings (?settings=org/…) can open over any org page: load
  // the open panel's data here so it's server-rendered with the page.
  const orgSettings = await loadOrgSettings(args.request, profile)

  return { organization, profile, organizations, orgSettings }
}

export const shouldRevalidate = revalidateOn({ params: ["slug"], settings: "org" })

export default function OrgLayout() {
  // `?modal=new-office` opens the create-office modal over ANY org page (the
  // office scene included) — like `?modal=new-organization` in app.tsx. (It used
  // to live on the offices list, which redirects to the first office when there
  // are offices, dropping the param — so "New office" did nothing.)
  const [searchParams] = useSearchParams()
  return (
    <>
      <Outlet />
      {searchParams.get("modal") === "new-office" && <NewOffice />}
    </>
  )
}
