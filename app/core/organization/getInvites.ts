import { organizationInviteMapper } from "../organization-invite/mapper"
import type { OrganizationInvite } from "../organization-invite/types"
import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

interface GetOrganizationInvitesArgs {
  userEmail: string
  slug: string
}

export const getOrganizationInvites =
  ({ mainRepository }: CoreContext) =>
  async ({ userEmail, slug }: GetOrganizationInvitesArgs): Promise<OrganizationInvite[]> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const invites = await mainRepository.organizationInvite.findMany({
      filter: { organizationSlug: slug },
    })

    return invites.map(organizationInviteMapper.fromRepository)
  }
