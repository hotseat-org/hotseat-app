import { Card, CardBody } from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Outlet, useLoaderData, useNavigate, useParams } from '@remix-run/react'
import type { Space } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import type { Seat } from '~/core/seat/types'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  await requireUser(request)

  const core = getCore()
  if (!params.id) throw new Error('Missing ID in params')

  const space = await core.space.get(params.id)
  const seats = await core.seat.getManySpaces(space.id)

  return { space, seats }
}

const EditSpace = () => {
  const [spaceView, setSpaceView] = useState<Space | undefined>(undefined)
  const { space, seats } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const { furnitureId } = useParams()

  const id = space.id

  const allSeats = useMemo(
    () => [...seats, { furnitureId }],
    [seats, furnitureId]
  ) as Seat[] // * There is some retarded type in addDataLayer fn

  useEffect(() => {
    if (spaceView) {
      spaceView.addDataLayer({
        id: 'desks',
        type: 'furniture',
        data: allSeats.map((seat) => ({ furnitureId: seat.furnitureId })),
        color: (d) => {
          if (d.furnitureId === furnitureId) return '#8e44ad'
          if (d.furnitureId) return '#2E4053'
          return 'inherit'
        },
      })
    }
  }, [allSeats, spaceView, furnitureId])

  useEffect(() => {
    if (spaceView) {
      spaceView.enablePickingMode({
        onPick: (data) => {
          if (data.furnitureId) {
            navigate(`/space/${id}/edit/furniture/${data.furnitureId}`, {
              replace: true,
            })
          }
        },
      })
    }
  }, [spaceView, navigate, id])

  const onSpaceReady = useCallback((space: Space) => {
    setSpaceView(space)
  }, [])

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

export default EditSpace
