import { Role } from "@prisma/client"
import type { CoreContext } from "../types"
import { organizationMapper } from "./mapper"
import type { Organization } from "./types"

export interface UpdateOrganizationArgs {
  slug: string
  userEmail: string
  data: {
    name?: string
    thumbnail?: string | null
    description?: string
  }
}

export const updateOrganization =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ slug, userEmail, data }: UpdateOrganizationArgs): Promise<Organization> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug: slug,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const organization = await mainRepository.organization.update({
      slug,
      data,
    })

    return organizationMapper(imageService).fromRepository(organization)
  }
