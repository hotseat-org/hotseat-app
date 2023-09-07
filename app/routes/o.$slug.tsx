import { redirect, type LoaderArgs } from '@vercel/remix'

import { requireUser } from '~/services/session.server'

import { Response, json } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { HeaderOrganization } from '~/components/NavbarOrganization'
import { getCore } from '~/core/get-core'

export const loader = async ({ request, params }: LoaderArgs) => {
  const slug = params.slug

  if (!slug) return redirect('/app')

  const user = await requireUser(request)
  const core = getCore()

  const organization = await core.organization.getForUser({
    userId: user.id,
    slug,
  })

  if (!organization) throw new Response('Not found', { status: 404 })

  return json(organization)
}

export default function Index() {
  const organization = useLoaderData<typeof loader>()

  return (
    <>
      <HeaderOrganization organization={organization} />
      <Outlet />
    </>
  )
}
