import { redirect, type LoaderArgs } from '@remix-run/node'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  if (!slug) return redirect('/')

  const core = getCore()

  try {
    const profile = await core.organization.confirmInvite({
      email: user.email,
      organizationSlug: slug,
    })
    return redirect(`/o/${profile.organizationSlug}`)
  } catch (e) {
    return redirect('/')
  }
}
