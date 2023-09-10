import type { Profile } from '../profile/types'
import type { CoreContext } from '../types'

interface GetOrganizationMembersArgs {
  userId: string
  slug: string
}

export const getOrganizationMembers =
  ({ mainRepository }: CoreContext) =>
  async ({ userId, slug }: GetOrganizationMembersArgs): Promise<Profile[]> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userId,
    })

    if (!profile) throw new Error('Forbidden')

    const profiles = await mainRepository.profile.findMany({
      filter: { organizationSlug: slug },
    })

    return profiles
  }
