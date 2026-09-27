import type { LoaderFunctionArgs } from "react-router"
import { data, redirect } from "react-router"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireUser } from "~/services/session.server"

interface Options {
  requiredRole?: Role
}

export const requireProfile = async (
  { request, params }: LoaderFunctionArgs,
  options?: Options
) => {
  const slug = params.slug

  if (!slug) throw redirect("/app")

  const user = await requireUser(request)
  const core = getCore()

  // Not a member (or no such organization): a 404, not a raw server error.
  // (Same answer either way, so it doesn't reveal which orgs exist.)
  const profile = await core.profile
    .get({ userEmail: user.email, organizationSlug: slug })
    .catch(() => {
      throw data("Organization not found", { status: 404, statusText: "Not Found" })
    })

  if (options?.requiredRole && options.requiredRole !== profile.role) {
    throw redirect(`/app/o/${slug}`)
  }

  return profile
}
