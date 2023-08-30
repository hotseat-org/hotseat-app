import { Button, Typography } from '@material-tailwind/react'
import type { LoaderArgs } from '@vercel/remix'
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from '@remix-run/react'
import type { Space as SpaceView } from '@smplrspace/smplr-loader/dist/generated/smplr'
import { DateTime } from 'luxon'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SpaceViewer } from '~/components/SpaceView'
import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'

export const loader = async ({ request, params }: LoaderArgs) => {
  const user = await requireUser(request)
  const core = getCore()

  const me = await core.user.get(user.id)

  if (!params.id) throw new Error('Missing ID in params')

  // TODO: Make util fn for all of these ugly date machinations
  const url = new URL(request.url)
  const year = Number(url.searchParams.get('year'))
  const month = Number(url.searchParams.get('month'))
  const day = Number(url.searchParams.get('day'))

  const from = DateTime.utc(year, month, day).startOf('day')
  const to = from.endOf('day')

  const space = await core.space.get({
    id: params.id,
    filter: { reservations: { from: from.toJSDate(), to: to.toJSDate() } },
  })

  const [userSeats, userReservations] = await Promise.all([
    core.seat.getManyByUser(user.id, space.id),
    core.reservation.getManyByUser(user.id),
  ])

  const allUserSeats = [
    ...userSeats,
    ...userReservations.map((reservation) => reservation.seat).flat(),
  ]

  return { space, me, allUserSeats }
}

const Space = () => {
  const { space, allUserSeats } = useLoaderData<typeof loader>()
  const [spaceView, setSpaceView] = useState<SpaceView | undefined>(undefined)
  const navigate = useNavigate()

  const mySeatsSet = useMemo(
    () => new Set<string>(allUserSeats.map((seat) => seat.id)),
    [allUserSeats]
  )

  useEffect(() => {
    if (spaceView && space) {
      spaceView.addDataLayer({
        id: 'desks',
        type: 'furniture',
        data: space.seats.map((seat) => ({
          furnitureId: seat.furnitureId,
          isAvailable: seat.reservations.length === 0,
          hasResident: !!seat.residentId,
          isMySeat: mySeatsSet.has(seat.id),
        })),
        tooltip: (d) => {
          if (d.isAvailable) return 'Available'
          return 'Unavailable'
        },
        color: (d) => {
          if (d.isAvailable && !d.hasResident) return '#78e08f'
          return '#b71540'
        },
      })
    }
  }, [space, spaceView, mySeatsSet])

  const location = useLocation()

  useEffect(() => {
    if (spaceView) {
      spaceView.enablePickingMode({
        onPick: (data) => {
          if (data.furnitureId) {
            const seat = space.seats.find(
              (seat) => seat.furnitureId === data.furnitureId
            )

            seat &&
              navigate(`seat/${seat.id}${location.search}`, {
                replace: true,
              })
          }
        },
      })
    }
  }, [spaceView, navigate, space.id, space.seats, location])

  const onSpaceReady = useCallback((space: SpaceView) => {
    setSpaceView(space)
  }, [])

  if (!space) return <div>Error loading space</div>

  const url = new URL(`http://${location.pathname}${location.search}`)
  const year = Number(url.searchParams.get('year'))
  const month = Number(url.searchParams.get('month'))
  const day = Number(url.searchParams.get('day'))

  const today = DateTime.utc(year, month, day)
  const tomorrow = today.plus({ day: 1 })
  const yesterday = today.minus({ day: 1 })

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
        <div className="flex gap-4 items-center">
          <Link
            to={`${location.pathname}?year=${yesterday.year}&month=${yesterday.month}&day=${yesterday.day}`}
          >
            <Button type="submit" variant="text">
              Previous day
            </Button>
          </Link>
          <Typography variant="small">
            {today.toLocaleString({ dateStyle: 'full' })}
          </Typography>
          <Link
            to={`${location.pathname}?year=${tomorrow.year}&month=${tomorrow.month}&day=${tomorrow.day}`}
          >
            <Button variant="text">Next day</Button>
          </Link>
        </div>
        <Outlet />
      </div>
      <SpaceViewer spaceId={space.spaceId} onSpaceReady={onSpaceReady} />
    </>
  )
}

export default Space
