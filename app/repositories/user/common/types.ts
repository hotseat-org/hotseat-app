import type { MaybePromise } from '~/utils/ts'

export interface User {
  id: string
  email: string
  isAdmin: boolean
  firstname: string
  lastname: string
}

export interface FindUserArgs {
  email: string
}

export interface UserRepository {
  find: (args: FindUserArgs) => MaybePromise<User | null>
  findMany: () => MaybePromise<Array<User>>
}
