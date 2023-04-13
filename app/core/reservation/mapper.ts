import type { Reservation as RepositoryReservation } from '~/repository/types'
import type { Reservation } from './types'
import { userMapper } from '../user/mapper'
import { seatMapper } from '../seat/mapper'

export const reservationMapper = {
  fromRepository: (reservation: RepositoryReservation): Reservation => ({
    id: reservation.id,
    by: userMapper.fromRepository(reservation.by),
    seat: seatMapper.fromRepository(reservation.seat),
  }),
}
