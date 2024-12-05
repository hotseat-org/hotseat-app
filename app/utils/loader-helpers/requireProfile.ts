import type { Role } from "@prisma/client"
import type { LoaderFunctionArgs } from "react-router"
import { redirect } from "react-router"
import { getCore } from "~/core/get-core"
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

  const profile = await core.profile.get({
    userEmail: user.email,
    organizationSlug: slug,
  })

  if (options?.requiredRole && options.requiredRole !== profile.role) {
    throw redirect(`/o/${slug}`)
  }

  return profile
}
