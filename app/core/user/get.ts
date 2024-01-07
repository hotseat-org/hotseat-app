import type { CoreContext } from '../types'
import type { User } from './types'

export const getUser =
  ({ mainRepository, mappers }: CoreContext) =>
  async (email: string): Promise<User | null> => {
    const user = await mainRepository.user.find({ email })

    return user && mappers.user.fromRepository(user)
  }
