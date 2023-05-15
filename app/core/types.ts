import type { MainRepository } from '~/repositories/main-repository/types'
import type { UserRepository } from '~/repositories/user/common'

export interface CoreContext {
  userRepository: UserRepository
  mainRepository: MainRepository
}
