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

    const [invites, members] = await Promise.all([
      mainRepository.organizationInvite.findMany({ filter: { organizationSlug: slug } }),
      mainRepository.profile.findMany({ filter: { organizationSlug: slug } }),
    ])
    // Someone who has joined since (e.g. by the universal link) isn't pending.
    const joined = new Set(members.data.map((m) => m.userEmail.toLowerCase()))

    return invites
      .filter((invite) => !joined.has(invite.email.toLowerCase()))
      .map(organizationInviteMapper.fromRepository)
  }
