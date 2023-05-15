import type { Seat as RepositorySeat } from '~/repositories/main-repository/types'
import type { Seat } from './types'
import { reservationMapper } from '../reservation/mapper'

export const seatMapper = {
  fromRepository: (seat: RepositorySeat): Seat => ({
    id: seat.id,
    furnitureId: seat.furnitureId,
    reservations:
      seat.reservations?.map(reservationMapper.fromRepository) ?? [],
    residentId: seat.residentId,
  }),
}
