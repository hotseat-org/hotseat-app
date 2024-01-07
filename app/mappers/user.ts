import { User } from '~/core/user/types'
import type { User as RepositoryUser } from '~/repositories/main-repository/types'
import { ImageService } from '~/services/images/types'

export const createUserMapper = (imageService: ImageService) => ({
  fromRepository: async (user: RepositoryUser): Promise<User> => ({
    displayName: user.displayName,
    photo: user.avatarUrl
      ? await imageService.getSignedUrl(user.avatarUrl, 'thumbnail')
      : undefined,
    email: user.email,
  }),
})
