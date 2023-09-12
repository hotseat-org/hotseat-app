import { organizationMapper } from '../organization/mapper'
import type { OrganizationWithMembers } from '../organization/types'
import type { CoreContext } from '../types'

export const getUserOrganizations =
  ({ mainRepository, imageService }: CoreContext) =>
  async (userEmail: string): Promise<OrganizationWithMembers[]> => {
    const organizations = await mainRepository.organization.findMany({
      filter: { userEmail },
    })

    const mapper = organizationMapper(imageService)

    const result = await Promise.all(
      organizations.map(
        async (organization): Promise<OrganizationWithMembers> => {
          const profiles = await mainRepository.profile.findMany({
            filter: { organizationSlug: organization.slug },
            pagination: { skip: 0, take: 4 },
          })

          const mappedOrganization = await mapper.fromRepository(organization)

          return {
            ...mappedOrganization,
            members: profiles,
          }
        }
      )
    )

    return result
  }
