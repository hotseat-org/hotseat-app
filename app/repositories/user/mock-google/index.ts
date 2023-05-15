import type { UserRepository } from '~/repositories/user/common'
import { mockedGoogleUsers } from '~/repositories/user/mock-google/dataset'
import { toUser } from '~/repositories/user/mock-google/transforms'
import type { FindUserArgs } from '~/repositories/user/common'

const find = ({ id, email }: FindUserArgs) => {
  const result = mockedGoogleUsers.find((user) => {
    const matchId = id ? user.id === id : null
    const matchEmail = email ? user.primaryEmail === email : null

    return [matchId, matchEmail].some((item) => item === true)
  })

  return result ? toUser(result) : null
}

const findMany = () => mockedGoogleUsers.map(toUser)

export const createUserMockGoogleRepository = (): UserRepository => {
  return {
    find,
    findMany,
  }
}
