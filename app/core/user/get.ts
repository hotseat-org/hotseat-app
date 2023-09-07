import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

export const getUser =
  ({ mainRepository }: CoreContext) =>
  async (email: string): Promise<User | null> => {
    const user = await mainRepository.user.find({ email })

    return user && userMapper.fromRepository(user)
  }
