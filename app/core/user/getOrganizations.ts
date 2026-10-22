import assert from "assert"
import { organizationMapper } from "../organization/mapper"
import type { OrganizationWithMembers } from "../organization/types"
import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export const getUserOrganizations =
  ({ mainRepository, imageService, mappers }: CoreContext) =>
  async (userEmail: string): Promise<OrganizationWithMembers[]> => {
    const organizations = await mainRepository.organization.findMany({
      filter: { userEmail },
    })

    const mapper = organizationMapper(imageService)

    const result = await Promise.all(
      organizations.map(async (organization): Promise<OrganizationWithMembers> => {
        const profiles = await mainRepository.profile.findMany({
          filter: { organizationSlug: organization.slug },
          pagination: { skip: 0, take: 4 },
        })

        const mappedOrganization = await mapper.fromRepository(organization)
        const profile = await mainRepository.profile.find({
          userEmail,
          organizationSlug: organization.slug,
        })

        assert(profile)
        const admins = await mainRepository.profile.findMany({
          filter: { organizationSlug: organization.slug, role: Role.ADMIN },
          pagination: { skip: 0, take: 0 },
        })

        return {
          ...mappedOrganization,
          members: {
            ...profiles,
            data: await Promise.all(profiles.data.map(mappers.profile.fromRepository)),
          },
          profile,
          adminCount: admins.totalCount,
        }
      })
    )

    return result
  }
