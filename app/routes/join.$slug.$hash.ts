import { redirect, type LoaderArgs } from '@remix-run/node'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  const user = await requireUser(request)

  const slug = params.slug
  const hash = params.hash
  console.log({ slug, hash })
  if (!slug || !hash) return redirect('/')

  const core = getCore()

  try {
    const profile = await core.organization.joinWithHash({
      email: user.email,
      hash,
    })
    return redirect(`/o/${profile.organizationSlug}`)
  } catch (e) {
    return redirect('/')
  }
}
