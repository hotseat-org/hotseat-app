import { organizationMapper } from "../organization/mapper"
import type { OrganizationSummary } from "../organization/types"
import type { CoreContext } from "../types"

/** Someone's organizations, lean (one query): for the switcher, not the settings panel. */
export const listUserOrganizations =
  ({ mainRepository, imageService }: CoreContext) =>
  async (userEmail: string): Promise<OrganizationSummary[]> => {
    const mapper = organizationMapper(imageService)
    const rows = await mainRepository.organization.findSummaries({ userEmail })
    return Promise.all(
      rows.map(async ({ role, memberCount, ...organization }) => ({
        ...(await mapper.fromRepository(organization)),
        role,
        memberCount,
      }))
    )
  }
