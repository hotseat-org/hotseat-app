import type { CoreContext } from '../types'
import type { Profile } from './types'

interface GetProfileArgs {
  userEmail: string
  organizationSlug: string
}

export const getProfile =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ userEmail, organizationSlug }: GetProfileArgs): Promise<Profile> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug,
    })

    if (!profile) throw new Error('Forbidden')

    return profile
  }
