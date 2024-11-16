import { Role } from "@prisma/client"
import type { CoreContext } from "../types"

export interface LeaveOrganizationArgs {
  email: string
  organizationSlug: string
}

export const leaveOrganization =
  ({ mainRepository }: CoreContext) =>
  async ({ email, organizationSlug }: LeaveOrganizationArgs): Promise<void> => {
    const members = await mainRepository.profile.findMany({
      filter: { organizationSlug, role: Role.ADMIN },
    })

    const currentProfile = await mainRepository.profile.find({
      userEmail: email,
      organizationSlug,
    })

    // * User is not in this organization
    if (!currentProfile) {
      return
    }

    const currentRole = currentProfile.role

    // * When user is demoted from admin to user, ensure there is always at least one admin
    // * TLDR: if you are the only admin, you can't demote yourself to user
    if (currentRole === Role.ADMIN) {
      if (members.data.length < 2) {
        throw new Error("There always needs to be at least one admin")
      }
    }

    await mainRepository.profile.delete({ organizationSlug, userEmail: email })

    return
  }
