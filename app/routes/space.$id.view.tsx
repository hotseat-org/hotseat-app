import { Typography } from '@material-tailwind/react'
import type { LoaderArgs } from '@remix-run/node'
import { Outlet, useLoaderData, useNavigate } from '@remix-run/react'
import type { Space as SpaceView } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  const me = await core.user.get(user.id)

  if (!params.id) throw new Error('Missing ID in params')

  const space = await core.space.get(params.id)

  return { space, me }
}

const Space = () => {
  const { space, me } = useLoaderData<typeof loader>()
  const [spaceView, setSpaceView] = useState<SpaceView | undefined>(undefined)
  const navigate = useNavigate()

  // TODO: Yo, this should be computed on the BE
  const mySeatsSet = useMemo(() => {
    if (me) {
      const allSeats = [
        ...me.reservations.map((reservation) => reservation.seat).flat(),
        ...me.seatsResident,
      ]
      return new Set<string>(allSeats.map((seat) => seat.id))
    }

    return new Set<string>()
  }, [me])

  useEffect(() => {
    if (spaceView && space) {
      spaceView.addDataLayer({
        id: 'desks',
        type: 'furniture',
        data: space.seats.map((seat) => ({
          furnitureId: seat.furnitureId,
          isAvailable: seat.reservations.length === 0,
          hasResident: !!seat.resident,
          isMySeat: mySeatsSet.has(seat.id),
        })),
        tooltip: (d) => {
          if (d.isMySeat) return 'Your seat!'
          if (d.isAvailable) return 'Available'
          return 'Unavailable'
        },
        color: (d) => {
          if (d.isMySeat) return '#1e3799'
          if (d.isAvailable && !d.hasResident) return '#78e08f'
          return '#b71540'
        },
      })
    }
  }, [space, spaceView, mySeatsSet])

  useEffect(() => {
    if (spaceView) {
      spaceView.enablePickingMode({
        onPick: (data) => {
          if (data.furnitureId) {
            const seat = space.seats.find(
              (seat) => seat.furnitureId === data.furnitureId
            )

            seat &&
              navigate(`/space/${space.id}/view/seat/${seat.id}`, {
                replace: true,
              })
          }
        },
      })
    }
  }, [spaceView, navigate, space.id, space.seats])

  const onSpaceReady = useCallback((space: SpaceView) => {
    setSpaceView(space)
  }, [])

  if (!space) return <div>Error loading space</div>

  return (
    <>
      <div className="fixed w-96 z-10 left-24 mt-24">
        <Typography variant="h4">{space.name}</Typography>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#78e08f]" />
          <Typography variant="small">Available seat</Typography>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#1e3799]" />
          <Typography variant="small">Your seat(s)</Typography>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 rounded-full bg-[#b71540]" />
          <Typography variant="small">Unavailable seat</Typography>
        </div>
        <Outlet />
      </div>
      <SpaceViewer spaceId={space.spaceId} onSpaceReady={onSpaceReady} />
    </>
  )
}

export default Space
