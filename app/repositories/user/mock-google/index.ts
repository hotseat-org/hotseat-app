import type { UserRepository } from '~/repositories/user/common'
import {
  mockedGoogleUsers,
  mockedUsers,
} from '~/repositories/user/mock-google/dataset'
import { toUser } from '~/repositories/user/mock-google/transforms'
import type { FindUserArgs } from '~/repositories/user/common'

const find = ({ email }: FindUserArgs) => {
  const result = mockedUsers.get(email)

  return result ? toUser(result) : null
}

const findMany = () => mockedGoogleUsers.map(toUser)

export const createUserMockGoogleRepository = (): UserRepository => {
  return {
    find,
    findMany,
  }
}
