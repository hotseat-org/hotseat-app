import type { CoreContext } from '../types'
import { organizationMapper } from './mapper'
import type { Organization } from './types'

interface GetOrganizationForUserArgs {
  userId: string
  slug: string
}

export const getOrganizationForUser =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({
    userId,
    slug,
  }: GetOrganizationForUserArgs): Promise<Organization | null> => {
    const organization = await mainRepository.organization.find({
      slug,
      userId,
    })

    if (!organization) return null

    return organizationMapper(imageService).fromRepository(organization)
  }
