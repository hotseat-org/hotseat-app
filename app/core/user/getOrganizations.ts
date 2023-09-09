import { organizationMapper } from '../organization/mapper'
import type { Organization } from '../organization/types'
import type { CoreContext } from '../types'

export const getUserOrganizations =
  ({ mainRepository, imageService }: CoreContext) =>
  async (userId: string): Promise<Organization[]> => {
    const organizations = await mainRepository.organization.findMany({
      filter: { userId },
    })

    const mapper = organizationMapper(imageService)
    return Promise.all(organizations.map(mapper.fromRepository))
  }
