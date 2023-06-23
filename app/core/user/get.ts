import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

export const getUser =
  ({ userRepository }: CoreContext) =>
  async (email: string): Promise<User | null> => {
    const user = await userRepository.find({ email })

    return user && userMapper.fromRepository(user)
  }
