import type { CoreContext } from '../types'
import type { Profile } from './types'

interface GetProfileArgs {
  userId: string
  organizationSlug: string
}

export const getProfile =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ userId, organizationSlug }: GetProfileArgs): Promise<Profile> => {
    const profile = await mainRepository.profile.find({
      userId,
      organizationSlug,
    })

    if (!profile) throw new Error('Forbidden')

    return profile
  }
