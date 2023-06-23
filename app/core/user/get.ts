import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

export const getUser =
  ({ userRepository }: CoreContext) =>
  async (id: string): Promise<User | null> => {
    const user = await userRepository.find({ id })

    return user && userMapper.fromRepository(user)
  }
