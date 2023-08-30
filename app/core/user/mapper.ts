import type { User as RepositoryUser } from '~/repositories/main-repository/types'
import type { User } from './types'

export const userMapper = {
  fromRepository: (user: RepositoryUser): User => ({
    id: user.id,
    displayName: user.displayName,
    photo: user.avatarUrl ?? undefined,
  }),
}
