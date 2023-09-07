import type { Organization } from '../organization/types'
import type { CoreContext } from '../types'

export const getUserOrganizations =
  ({ mainRepository }: CoreContext) =>
  async (userId: string): Promise<Organization[]> => {
    const organizations = await mainRepository.organization.findMany({
      filter: { userId },
    })

    return organizations
  }
