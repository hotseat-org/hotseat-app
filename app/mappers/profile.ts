import { Profile } from '~/core/profile/types'
import type { Profile as RepositoryProfile } from '~/repositories/main-repository/types'
import { ImageService } from '~/services/images/types'

export const createProfileMapper = (imageService: ImageService) => ({
  fromRepository: async (profile: RepositoryProfile): Promise<Profile> => ({
    ...profile,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl
      ? await imageService.getSignedUrl(profile.avatarUrl, 'thumbnail')
      : undefined,
  }),
})
