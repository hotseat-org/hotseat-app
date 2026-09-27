import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

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
        throw new Error("There always needs to be at least one admin. Create a new admin first.")
      }
    }

    // Their bookings go with the profile (FK cascade). Permanent desks live in
    // the layouts, so free those explicitly — they become bookable again.
    await mainRepository.profile.delete({ organizationSlug, userEmail: email })
    await releasePermanentDesks(mainRepository, organizationSlug, email)
  }

/** Clear a person's permanent-resident desks in every office of an organization. */
const releasePermanentDesks = async (
  mainRepository: CoreContext["mainRepository"],
  organizationSlug: string,
  email: string
) => {
  const offices = await mainRepository.office.findMany({ filter: { organizationSlug } })
  for (const office of offices.data) {
    if (!Array.isArray(office.layout)) continue
    const layout = office.layout as { assignee?: string }[]
    if (!layout.some((o) => o?.assignee === email)) continue
    await mainRepository.office.update({
      organizationSlug,
      slug: office.slug,
      data: {
        layout: layout.map((o) => (o?.assignee === email ? { ...o, assignee: undefined } : o)),
      },
    })
  }
}
