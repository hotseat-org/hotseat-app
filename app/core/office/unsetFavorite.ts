import { Profile } from '../profile/types'
import type { CoreContext } from '../types'

export interface UnsetOfficeFavoriteArgs {
  organizationSlug: string
  email: string
}

export const unsetOfficeFavorite =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    organizationSlug,
    email,
  }: UnsetOfficeFavoriteArgs): Promise<Profile> => {
    const result = await mainRepository.profile.update({
      userEmail: email,
      organizationSlug,
      data: {
        favoriteOfficeSlug: null,
      },
    })

    return await mappers.profile.fromRepository(result)
  }
