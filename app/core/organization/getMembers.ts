import type { Profile } from '../profile/types'
import type { CoreContext } from '../types'

interface GetOrganizationMembersArgs {
  userEmail: string
  slug: string
}

export const getOrganizationMembers =
  ({ mainRepository }: CoreContext) =>
  async ({
    userEmail,
    slug,
  }: GetOrganizationMembersArgs): Promise<Profile[]> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error('Forbidden')

    const profiles = await mainRepository.profile.findMany({
      filter: { organizationSlug: slug },
    })

    return profiles
  }
