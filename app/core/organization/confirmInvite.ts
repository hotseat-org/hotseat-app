import dayjs from "dayjs"
import type { Profile } from "../profile/types"
import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface ConfirmOrganizationInviteArgs {
  email: string
  organizationSlug: string
}

export const confirmOrganizationInvite =
  ({ mainRepository }: CoreContext) =>
  async ({ email, organizationSlug }: ConfirmOrganizationInviteArgs): Promise<Profile> => {
    const invite = await mainRepository.organizationInvite.find({
      email,
      organizationSlug,
    })

    if (!invite) {
      throw new Error("Invitation for user with this email was not found")
    }

    const isExpired = dayjs().isAfter(dayjs(invite.expiresAt))
    if (isExpired) throw new Error("Invitation is expired")

    const user = await mainRepository.user.find({ email: invite.email })
    if (!user) throw new Error("User not found")

    const profile = await mainRepository.profile.create({
      organizationSlug,
      email,
      // Name/avatar come from the user record (profiles don't store them).
      data: { role: Role.USER },
    })

    await mainRepository.organizationInvite.delete({
      email: invite.email, // as stored (the lookup ignores case)
      organizationSlug,
    })

    return profile
  }
