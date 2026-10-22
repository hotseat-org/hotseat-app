import { redirect, useLoaderData, useLocation, useSearchParams } from "react-router"
import { Route } from "./+types/join.$slug._index"
import { getCore } from "~/core/get-core"
import { isAuthenticated, requireUser } from "~/services/session.server"
import { JoinCard, JoinProblem } from "~/components/JoinScreen"
import { LoginScreen } from "~/components/LoginScreen"

/**
 * An email invitation's link (and what a pasted invite code lands on): the
 * same accept screen as the universal link — or why you can't join.
 */
export const loader = async ({ request, params: { slug } }: Route.LoaderArgs) => {
  const core = getCore()
  const organization = await core.organization.getForPublic({ slug })
  if (!organization) {
    // A bare universal invite code pasted on the welcome screen.
    const byCode = await core.organization.getForPublic({ hash: slug })
    if (byCode) throw redirect(`/join/${byCode.slug}/${slug}`)
    // An invite link from before a rename.
    const renamed = await core.organization.renamedTo(slug)
    if (renamed) throw redirect(`/join/${renamed}`)
  }
  const org = organization && {
    name: organization.name,
    description: organization.description ?? undefined,
    thumbnailUrl: organization.thumbnailUrl,
  }

  const user = await isAuthenticated(request)
  if (!user) return { authed: false, org, email: "", hasInvite: false }
  if (org && (await core.user.isMember({ userEmail: user.email, organizationSlug: slug })))
    throw redirect(`/app/o/${slug}`)
  const invites = org ? await core.user.getOrganizationInvites(user.email) : []
  const hasInvite = invites.some((invite) => invite.organizationSlug === slug)
  return { authed: true, org, email: user.email as string, hasInvite }
}

export const action = async ({ request, params: { slug } }: Route.ActionArgs) => {
  const user = await requireUser(request)
  const form = await request.formData()
  if (form.get("intent") === "decline") throw redirect("/app")
  try {
    const profile = await getCore().organization.confirmInvite({
      email: user.email,
      organizationSlug: slug,
    })
    return redirect(`/app/o/${profile.organizationSlug}`)
  } catch {
    return redirect(`/join/${slug}?error=invalid`)
  }
}

export default function JoinByInvitation() {
  const { authed, org, email, hasInvite } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  if (!authed)
    return (
      <LoginScreen
        redirectTo={location.pathname}
        title={org ? `Join ${org.name}` : undefined}
        subtitle={org ? "Sign in with the email you were invited at" : undefined}
      />
    )
  if (!org)
    return (
      <JoinProblem title="Organization not found">
        There&apos;s no organization behind this link or code. Check it with the teammate who sent
        it.
      </JoinProblem>
    )
  if (!hasInvite || searchParams.get("error") === "invalid")
    return (
      <JoinProblem title={`No invitation to ${org.name}`}>
        There&apos;s no open invitation for {email} — it may have expired. Ask an admin of{" "}
        {org.name} to invite this email, or to send you their universal invite link.
      </JoinProblem>
    )
  return <JoinCard organization={org} />
}
