import { Role } from "@prisma/client"
import dayjs from "dayjs"
import type { Profile } from "../profile/types"
import type { CoreContext } from "../types"

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
      data: {
        displayName: user.displayName,
        role: Role.USER,
        avatarUrl: user.avatarUrl,
      },
    })

    await mainRepository.organizationInvite.delete({
      email,
      organizationSlug,
    })

    return profile
  }
