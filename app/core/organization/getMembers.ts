import type { PaginatedResult } from '~/repositories/main-repository/types'
import type { Profile } from '../profile/types'
import type { CoreContext } from '../types'

interface GetOrganizationMembersArgs {
  userEmail: string
  slug: string
}

export const getOrganizationMembers =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    userEmail,
    slug,
  }: GetOrganizationMembersArgs): Promise<PaginatedResult<Profile>> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error('Forbidden')

    const profiles = await mainRepository.profile.findMany({
      filter: { organizationSlug: slug },
      pagination: { skip: 0, take: 60 }, // TODO: Add pagination from the outside
    })

    return {
      ...profiles,
      data: await Promise.all(
        profiles.data.map(mappers.profile.fromRepository)
      ),
    }
  }
