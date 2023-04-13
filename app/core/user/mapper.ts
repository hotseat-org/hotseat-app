import type { User as RepositoryUser } from '~/repository/types'
import type { User } from './types'
import { reservationMapper } from '../reservation/mapper'
import { seatMapper } from '../seat/mapper'

export const userMapper = {
  fromRepository: (user: RepositoryUser): User => ({
    id: user.id,
    displayName: user.displayName ?? undefined,
    photo: user.photos?.[0]?.url,
    reservations:
      user.reservations?.map(reservationMapper.fromRepository) ?? [],
    seatsResident: user.seatsResident?.map(seatMapper.fromRepository) ?? [],
  }),
}
