import {
  Avatar,
  Button,
  Card,
  CardBody,
  Typography,
} from '@material-tailwind/react'
import type { ActionArgs, LoaderArgs } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { DateTime } from 'luxon'

import { getCore } from '~/core/get-core'
import { requireUser } from '~/services/session.server'
import { useUser } from '~/utils/remix'

enum ActionIntent {
  CreateReservation = 'CreateReservation',
  CancelReservation = 'CancelReservation',
}

export const loader = async ({ params, request }: LoaderArgs) => {
  const core = getCore()
  if (!params.seatId) throw new Error('Missing ID in params')

  const url = new URL(request.url)
  const year = Number(url.searchParams.get('year'))
  const month = Number(url.searchParams.get('month'))
  const day = Number(url.searchParams.get('day'))

  const from = DateTime.utc(year, month, day).startOf('day')
  const to = from.endOf('day')

  const seat = await core.seat.get({
    id: params.seatId,
    filter: { reservations: { from: from.toJSDate(), to: to.toJSDate() } },
  })
  return { seat }
}

export const action = async ({ request, params }: ActionArgs) => {
  if (!params.seatId) throw new Error('Missing ID in params')

  const url = new URL(request.url)
  const year = Number(url.searchParams.get('year'))
  const month = Number(url.searchParams.get('month'))
  const day = Number(url.searchParams.get('day'))

  const from = DateTime.utc(year, month, day).startOf('day')
  const to = from.endOf('day')

  const formData = await request.formData()
  const intent = formData.get('intent')

  const core = getCore()

  const user = await requireUser(request)

  if (intent === ActionIntent.CreateReservation) {
    await core.reservation.create({
      userId: user.id,
      seatId: params.seatId,
      from: from.toJSDate(),
      to: to.toJSDate(),
    })
  }

  if (intent === ActionIntent.CancelReservation) {
    const reservationId = formData.get('reservationId')

    typeof reservationId === 'string' &&
      (await core.reservation.cancel({ userId: user.id, id: reservationId }))
  }

  return null
}

const SeatDetail = () => {
  const { seat } = useLoaderData<typeof loader>()
  const user = useUser()

  const canBeReserved =
    !seat?.resident && (!seat?.reservations || seat.reservations.length === 0)

  return (
    <Form method="post" className="flex flex-col gap-2 mt-4">
      {seat?.resident && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Typography>
              This seat has a permanent resident and can't be reserved
            </Typography>
            <div className="flex gap-2 items-center">
              <Avatar variant="circular" src={seat.resident.photo} />
              <Typography>{seat.resident.displayName}</Typography>
            </div>
          </CardBody>
        </Card>
      )}

      {seat?.reservations.map((reservation) => (
        <Card key={reservation.id}>
          <CardBody className="flex flex-col gap-4">
            <Typography>This seat is reserved</Typography>
            <div className="flex gap-2 items-center">
              <Avatar variant="circular" src={reservation.by.photo} />
              <Typography>{reservation.by.displayName}</Typography>
            </div>
            {user.id === reservation.by.id && (
              <>
                <input
                  readOnly
                  className="hidden"
                  name="reservationId"
                  value={reservation.id}
                />
                <Button
                  name="intent"
                  value={ActionIntent.CancelReservation}
                  type="submit"
                  fullWidth
                  variant="text"
                  color="red"
                >
                  Cancel reservation
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      ))}
      {canBeReserved && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <Typography>
              This seat can be reserved for {new Date().toLocaleDateString()}
            </Typography>
            <Button
              name="intent"
              value={ActionIntent.CreateReservation}
              type="submit"
              fullWidth
            >
              Reserve
            </Button>
          </CardBody>
        </Card>
      )}
    </Form>
  )
}

export default SeatDetail
