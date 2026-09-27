import type { Profile } from "../profile/types"
import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface JoinOrganizationWithHashArgs {
  email: string
  hash: string
}

export const joinOrganizationWithHash =
  ({ mainRepository }: CoreContext) =>
  async ({ email, hash }: JoinOrganizationWithHashArgs): Promise<Profile> => {
    const user = await mainRepository.user.find({ email })
    if (!user) throw new Error("User not found")

    const organization = await mainRepository.organization.find({
      invitationHash: hash,
    })

    if (!organization) throw new Error("Organization not found")

    const currentProfile = await mainRepository.profile.find({
      userEmail: user.email,
      organizationSlug: organization.slug,
    })

    if (currentProfile) {
      return currentProfile
    }

    const profile = await mainRepository.profile.create({
      organizationSlug: organization.slug,
      email: user.email,
      // Name/avatar come from the user record (profiles don't store them).
      data: { role: Role.USER },
    })

    const invite = await mainRepository.organizationInvite.find({
      email,
      organizationSlug: organization.slug,
    })

    // * If user has invite, delete it as it's no longer needed
    if (invite) {
      await mainRepository.organizationInvite.delete({
        email,
        organizationSlug: organization.slug,
      })
    }

    return profile
  }
