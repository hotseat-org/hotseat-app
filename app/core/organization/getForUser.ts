import type { CoreContext } from '../types'
import type { Organization } from './types'

interface GetOrganizationForUserArgs {
  userId: string
  slug: string
}

export const getOrganizationForUser =
  ({ mainRepository }: CoreContext) =>
  async ({
    userId,
    slug,
  }: GetOrganizationForUserArgs): Promise<Organization | null> => {
    const organization = await mainRepository.organization.find({
      slug,
      userId,
    })

    return organization
  }
