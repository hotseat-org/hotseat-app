import { Card, CardBody } from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  await requireUser(request)

  const core = getCore()
  if (!params.id) throw new Error('Missing ID in params')

  const space = await core.space.get(params.id)

  return space
}

const Space = () => {
  const data = useLoaderData<typeof loader>()

  if (!data) return <div>Error loading space</div>

  return (
    <>
      <div className="fixed w-96 z-10 left-24 mt-24">
        <Card>
          <CardBody>{data.name}</CardBody>
        </Card>
        <Outlet />
      </div>
      <SpaceViewer spaceId={data.spaceId} />
    </>
  )
}

export default Space
