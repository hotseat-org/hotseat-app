import type { User as RepositoryUser } from '~/repositories/user/common'
import type { User } from './types'

export const userMapper = {
  fromRepository: (user: RepositoryUser): User => ({
    id: user.id,
    displayName: `${user.firstname} ${user.lastname}`,
    // TODO https://developers.google.com/admin-sdk/directory/v1/guides/manage-users#get_photo
    // photo: user.photos?.[0]?.url,
  }),
}
