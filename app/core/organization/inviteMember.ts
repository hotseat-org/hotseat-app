import { Role } from "@prisma/client"
import dayjs from "dayjs"
import { organizationInviteMapper } from "../organization-invite/mapper"
import type { OrganizationInvite } from "../organization-invite/types"
import type { CoreContext } from "../types"

export interface OrganizationInviteMemberArgs {
  userEmail: string
  slug: string
  data: {
    email: string
  }
}

export const organizationInviteMember =
  ({ mainRepository }: CoreContext) =>
  async ({ userEmail, slug, data }: OrganizationInviteMemberArgs): Promise<OrganizationInvite> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const invitedUserProfile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail: data.email,
    })

    if (invitedUserProfile) {
      if (invitedUserProfile) {
        throw new Error("User with this email is already member of this organization")
      }
    }

    const expiresAt = dayjs().add(7, "days").toDate()

    const invite = await mainRepository.organizationInvite.create({
      email: data.email,
      organizationSlug: slug,
      expiresAt,
    })

    return organizationInviteMapper.fromRepository(invite)
  }
