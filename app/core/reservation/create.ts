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
  ({ mainRepository }: CoreContext) =>
  async ({ userId, seatId, from, to }: Params): Promise<Reservation> => {
    const seat = await mainRepository.seat.find({
      id: seatId,
      filter: { reservations: { from, to } },
    })

    if (!seat) throw new Error('Seat not found')

    const userSeats = await mainRepository.seat.findMany({
      spaceId: seat.space.id,
      residentId: userId,
    })

    if (userSeats.length > 0)
      throw new Error("Permanent resident can't reserve a seat.")

    const userReservations = await mainRepository.reservation.findMany({
      userId,
      filter: { from, to },
    })

    if (userReservations.length > 0)
      throw new Error('You already have a reservation for this day.')

    if (seat?.residentId)
      throw new Error("Can't reserve a seat with permanent resident.")

    if (seat?.reservations && seat.reservations.length > 0)
      throw new Error('This seat is already reserved.')

    const reservation = await mainRepository.reservation.create({
      userId,
      seatId,
      from,
      to,
    })

    return reservationMapper.fromRepository(reservation)
  }
