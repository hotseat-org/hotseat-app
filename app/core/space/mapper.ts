import type { Space as RepositorySpace } from '~/repository/types'
import type { Space } from './types'
import { seatMapper } from '../seat/mapper'

export const spaceMapper = {
  fromRepository: (space: RepositorySpace): Space => ({
    id: space.id,
    description: space.description,
    name: space.name,
    seats: space.seats.map(seatMapper.fromRepository),
    spaceId: space.spaceId,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  }),
}
