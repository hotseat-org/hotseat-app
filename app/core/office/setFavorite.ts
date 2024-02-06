import { Profile } from '../profile/types'
import type { CoreContext } from '../types'

export interface SetOfficeFavoriteArgs {
  slug: string
  organizationSlug: string
  email: string
}

export const setOfficeFavorite =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    slug,
    organizationSlug,
    email,
  }: SetOfficeFavoriteArgs): Promise<Profile> => {
    const result = await mainRepository.profile.update({
      userEmail: email,
      organizationSlug,
      data: {
        favoriteOfficeSlug: slug,
      },
    })

    return await mappers.profile.fromRepository(result)
  }
