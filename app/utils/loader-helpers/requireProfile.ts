import type { LoaderFunctionArgs } from "react-router"
import { data, redirect } from "react-router"
import { getCore } from "~/core/get-core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { requireUser } from "~/services/session.server"
import { loadOncePerRequest } from "~/utils/loader-helpers/oncePerRequest"
import { redirectToRenamedPage } from "~/utils/loader-helpers/redirectToRenamed"

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
  // Once per request: an office page's loaders all ask, side by side.
  const profile = await loadOncePerRequest(request, `profile:${slug}`, () =>
    core.profile.get({ userEmail: user.email, organizationSlug: slug }).catch(() => null)
  )
  if (!profile) {
    // Renamed since this link was made: the same page under its new URL.
    const renamed = await core.organization.renamedTo(slug)
    if (renamed) throw redirectToRenamedPage(request, "/app/o/", slug, renamed)
    throw data("Organization not found", { status: 404, statusText: "Not Found" })
  }

  if (options?.requiredRole && options.requiredRole !== profile.role) {
    throw redirect(`/app/o/${slug}`)
  }

  return profile
}
