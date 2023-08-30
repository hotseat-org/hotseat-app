import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

interface CreateUserArgs {
  email: string
  displayName: string
  avatarUrl?: string
}

export const createUser =
  ({ mainRepository }: CoreContext) =>
  async ({ email, displayName, avatarUrl }: CreateUserArgs): Promise<User> => {
    const seat = await mainRepository.user.create({
      email,
      displayName,
      avatarUrl,
    })

    return userMapper.fromRepository(seat)
  }
