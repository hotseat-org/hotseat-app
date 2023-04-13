import type { Seat as RepositorySeat } from '~/repository/types'
import type { Seat } from './types'
import { userMapper } from '../user/mapper'
import { reservationMapper } from '../reservation/mapper'

export const seatMapper = {
  fromRepository: (seat: RepositorySeat): Seat => ({
    id: seat.id,
    furnitureId: seat.furnitureId,
    reservations: seat.reservations.map(reservationMapper.fromRepository),
    resident: seat.resident
      ? userMapper.fromRepository(seat.resident)
      : undefined,
  }),
}
