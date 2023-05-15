import type { Reservation as RepositoryReservation } from '~/repositories/main-repository/types'
import type { Reservation } from './types'
import { userMapper } from '../user/mapper'
import { seatMapper } from '../seat/mapper'

export const reservationMapper = {
  fromRepository: (reservation: RepositoryReservation): Reservation => ({
    id: reservation.id,
    userId: reservation.userId,
    seat: seatMapper.fromRepository(reservation.seat),
  }),
}
