import type { User as RepositoryUser } from '~/repository/types'
import type { User } from './types'

export const userMapper = {
  fromRepository: (user: RepositoryUser): User => ({
    id: user.id,
    displayName: user.displayName ?? undefined,
    photo: user.photos[0]?.url,
  }),
}
