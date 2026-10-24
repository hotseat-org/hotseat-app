import dayjs from "dayjs"
import { organizationInviteMapper } from "../organization-invite/mapper"
import type { OrganizationInvite } from "../organization-invite/types"
import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { LocalizedError } from "~/i18n/errors"

export interface OrganizationInviteMemberArgs {
  userEmail: string
  slug: string
  data: {
    email: string
  }
}

/** An invitation that can't be sent as asked — the message is shown to the admin. */
export class OrganizationInviteError extends LocalizedError {}

export const organizationInviteMember =
  ({ mainRepository }: CoreContext) =>
  async ({ userEmail, slug, data }: OrganizationInviteMemberArgs): Promise<OrganizationInvite> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const email = data.email.trim().toLowerCase()
    const members = await mainRepository.profile.findMany({ filter: { organizationSlug: slug } })
    if (members.data.some((m) => m.userEmail.toLowerCase() === email))
      throw new OrganizationInviteError("{email} is already a member.", {
        email: data.email.trim(),
      })

    // Inviting again renews the invitation (another 7 days).
    const existing = await mainRepository.organizationInvite.find({ email, organizationSlug: slug })
    if (existing)
      await mainRepository.organizationInvite.delete({
        email: existing.email,
        organizationSlug: slug,
      })

    const expiresAt = dayjs().add(7, "days").toDate()

    const invite = await mainRepository.organizationInvite.create({
      email,
      organizationSlug: slug,
      expiresAt,
    })

    return organizationInviteMapper.fromRepository(invite)
  }
