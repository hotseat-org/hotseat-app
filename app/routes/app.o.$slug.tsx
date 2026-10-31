import { Outlet, useLoaderData, useSearchParams, type LoaderFunctionArgs } from "react-router"
import NewOffice from "./app.o.$slug.offices.new"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireProfile } from "~/utils/loader-helpers/requireProfile"
import { loadOrgSettings } from "~/utils/loader-helpers/settings.server"
import { BOOKING_ACTIONS, revalidateOn } from "~/utils/revalidation"

// Org-scoped data for the whole subtree (read via useOrganizationContext /
// useProfile). The old colored org rail lived here — navigation now floats in
// the office shell (WorkspaceSwitcher / AccountMenu), so this is a pass-through.
export const loader = async (args: LoaderFunctionArgs) => {
  const profile = await requireProfile(args)
  const core = getCore()

  // Membership is checked above; the rest is independent — fetched together.
  const [organization, organizations, orgSettings, notifications] = await Promise.all([
    core.organization.getForPublic({ slug: profile.organizationSlug }),
    // Lean (one query): the switcher needs names, roles and member counts.
    core.user.listOrganizations(profile.userEmail),
    // Organization settings (?settings=org/…) can open over any org page: load
    // the open panel's data here so it's server-rendered with the page.
    loadOrgSettings(args.request, profile),
    // Under the bell (any org page): what others' changes did to this person.
    core.notification.list(profile.userEmail),
  ])

  if (!organization) throw new Response("Not found", { status: 404 })

  return { organization, profile, organizations, orgSettings, notifications }
}

export const shouldRevalidate = revalidateOn({
  params: ["slug"],
  settings: "org",
  unaffectedBy: [BOOKING_ACTIONS],
})

export default function OrgLayout() {
  // `?modal=new-office` opens the create-office modal over ANY org page (the
  // office scene included) — like `?modal=new-organization` in app.tsx. (It used
  // to live on the offices list, which redirects to the first office when there
  // are offices, dropping the param — so "New office" did nothing.)
  const [searchParams] = useSearchParams()
  const { profile } = useLoaderData<typeof loader>()
  // Only admins create offices: a member's ?modal=new-office shows nothing.
  const isCreatingOffice = searchParams.get("modal") === "new-office" && profile.role === Role.ADMIN
  return (
    <>
      <Outlet />
      {isCreatingOffice && <NewOffice />}
    </>
  )
}
