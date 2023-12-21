import type { CoreContext } from '../types'
import { organizationMapper } from './mapper'
import type { Organization } from './types'

interface GetOrganizationForUserArgs {
  slug: string
}

export const getOrganizationForPublic =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({
    slug,
  }: GetOrganizationForUserArgs): Promise<Organization | null> => {
    const organization = await mainRepository.organization.find({
      slug,
    })

    if (!organization) return null

    return organizationMapper(imageService).fromRepository(organization)
  }
