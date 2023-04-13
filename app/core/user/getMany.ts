import type { CoreContext } from '../types'
import { userMapper } from './mapper'
import type { User } from './types'

export const getManyUsers =
  ({ repository }: CoreContext) =>
  async (): Promise<User[]> => {
    const users = await repository.user.findMany()

    return users.map(userMapper.fromRepository)
  }
