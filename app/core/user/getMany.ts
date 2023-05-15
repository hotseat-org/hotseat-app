import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

export const getManyUsers =
  ({ userRepository }: CoreContext) =>
  async (): Promise<User[]> => {
    const users = await userRepository.findMany()

    return users.map(userMapper.fromRepository)
  }
