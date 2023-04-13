import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

interface Options {
  id: string
  email: string
  displayName?: string
  photos: string[]
}

export const createUser =
  ({ repository }: CoreContext) =>
  async (options: Options): Promise<User> => {
    const user = await repository.user.create({
      ...options,
      displayName: options.displayName ?? null,
    })

    return userMapper.fromRepository(user)
  }
