import { Card, CardBody } from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Outlet, useLoaderData } from '@remix-run/react'
import type { Space as SpaceView } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { useCallback, useEffect, useState } from 'react'
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
  const space = useLoaderData<typeof loader>()
  const [spaceView, setSpaceView] = useState<SpaceView | undefined>(undefined)

  useEffect(() => {
    if (spaceView && space) {
      spaceView.addDataLayer({
        id: 'desks',
        type: 'furniture',
        data: space.seats.map((seat) => ({
          furnitureId: seat.furnitureId,
          isAvailable: seat.reservations.length === 0,
          hasResident: !!seat.resident,
        })),
        tooltip: (d) => {
          if (d.isAvailable) return 'Available'
          return 'Unavailable'
        },
        color: (d) => {
          if (d.hasResident) return '#0a3d62'
          if (d.isAvailable) return '#78e08f'
          return '#b71540'
        },
      })
    }
  }, [space, spaceView])

  const onSpaceReady = useCallback((space: SpaceView) => {
    setSpaceView(space)
  }, [])

  if (!space) return <div>Error loading space</div>

  return (
    <>
      <div className="fixed w-96 z-10 left-24 mt-24">
        <Card>
          <CardBody>{space.name}</CardBody>
        </Card>
        <Outlet />
      </div>
      <SpaceViewer spaceId={space.spaceId} onSpaceReady={onSpaceReady} />
    </>
  )
}

export default Space
