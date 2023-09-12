import type { Role } from '@prisma/client'
import type { LoaderArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

interface Options {
  requiredRole?: Role
}

export const requireProfile = async (
  { request, params }: LoaderArgs,
  options?: Options
) => {
  const slug = params.slug

  if (!slug) throw redirect('/app')

  const user = await requireUser(request)
  const core = getCore()

  const profile = await core.profile.get({
    userId: user.id,
    organizationSlug: slug,
  })

  if (options?.requiredRole && options.requiredRole !== profile.role) {
    throw redirect(`/o/${slug}`)
  }

  return profile
}
