import { PaginatedResult } from '~/repositories/main-repository/types'
import { Office } from '../office/types'
import type { CoreContext } from '../types'

interface GetOrganizationOfficesArgs {
  userEmail: string
  slug: string
}

export const getOrganizationOffices =
  ({ mainRepository }: CoreContext) =>
  async ({
    userEmail,
    slug,
  }: GetOrganizationOfficesArgs): Promise<PaginatedResult<Office>> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error('Forbidden')

    const offices = await mainRepository.office.findMany({
      filter: { organizationSlug: slug },
    })

    return offices
  }
