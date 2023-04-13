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
    const user = await repository.user.find(userId)

    if (user?.seatsResident && user.seatsResident.length > 0)
      throw new Error("Permanent resident can't reserve a seat.")

    const seat = await repository.seat.find(seatId)

    if (seat?.resident)
      throw new Error("Can't reserve a seat with permanent resident.")

    const existingReservation = await repository.reservation.find({
      seatId,
      userId,
      filter: { from, to },
    })

    if (existingReservation && existingReservation.seat.id !== seatId)
      throw new Error('You already have a reservation for this day.')

    if (existingReservation) throw new Error('This seat is already reserved.')

    const reservation = await repository.reservation.create({
      userId,
      seatId,
      from,
      to,
    })

    return reservationMapper.fromRepository(reservation)
  }
