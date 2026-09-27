import { nanoid } from "nanoid"
import type { CoreContext } from "../types"
import { organizationMapper } from "./mapper"
import type { Organization } from "./types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface GenerateNewOrganizationInviteLinkArgs {
  userEmail: string
  organizationSlug: string
}

export const generateNewOrganizationInviteLink =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({
    userEmail,
    organizationSlug,
  }: GenerateNewOrganizationInviteLinkArgs): Promise<Organization> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug,
    })
    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const organization = await mainRepository.organization.update({
      slug: organizationSlug,
      data: { invitationHash: nanoid(8) },
    })

    return organizationMapper(imageService).fromRepository(organization)
  }
