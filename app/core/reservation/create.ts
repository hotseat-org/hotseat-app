import type { CoreContext } from '../types'
import { reservationMapper } from './mapper'
import type { Reservation } from './types'

interface Params {
  userId: string
  seatId: string
  from: Date
  to: Date
}

export const createReservation =
  ({ repository }: CoreContext) =>
  async ({ userId, seatId, from, to }: Params): Promise<Reservation> => {
    const user = await repository.user.find({
      id: userId,
      filter: { reservations: { from, to } },
    })

    if (user?.seatsResident && user.seatsResident.length > 0)
      throw new Error("Permanent resident can't reserve a seat.")

    if (user?.reservations && user.reservations?.length > 0)
      throw new Error('You already have a reservation for this day.')

    const seat = await repository.seat.find({
      id: seatId,
      filter: { reservations: { from, to } },
    })

    if (seat?.resident)
      throw new Error("Can't reserve a seat with permanent resident.")

    if (seat?.reservations && seat.reservations.length > 0)
      throw new Error('This seat is already reserved.')

    const reservation = await repository.reservation.create({
      userId,
      seatId,
      from,
      to,
    })

    return reservationMapper.fromRepository(reservation)
  }
