import type { User } from '~/repositories/user/common'
import type { MockGoogleUser } from '~/repositories/user/mock-google/types'

export const toUser = (user: MockGoogleUser): User => ({
  id: user.id,
  email: user.primaryEmail,
  isAdmin: user.isAdmin,
  firstname: user.name.givenName,
  lastname: user.name.familyName,
})
