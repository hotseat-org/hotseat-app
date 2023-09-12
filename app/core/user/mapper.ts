import type { User as RepositoryUser } from '~/repositories/main-repository/types'
import type { User } from './types'

export const userMapper = {
  fromRepository: (user: RepositoryUser): User => ({
    displayName: user.displayName,
    photo: user.avatarUrl ?? undefined,
    email: user.email,
  }),
}
