import dayjs from "dayjs"
import type { OrganizationInvite } from "./types"
import { InviteStatus } from "./types"
import type { OrganizationInvite as RepositoryOrganizationInvite } from "~/repositories/main-repository/types"

export const organizationInviteMapper = {
  fromRepository: (invite: RepositoryOrganizationInvite): OrganizationInvite => {
    const isExpired = dayjs().isAfter(dayjs(invite.expiresAt))
    return {
      email: invite.email,
      createdAt: invite.updatedAt,
      expiresAt: invite.expiresAt,
      organizationSlug: invite.organizationSlug,
      status: isExpired ? InviteStatus.EXPIRED : InviteStatus.PENDING,
    }
  },
}
