import type { CoreContext } from "../types"
import { organizationMapper } from "./mapper"
import type { Organization } from "./types"

interface GetOrganizationForUserArgs {
  userEmail: string
  slug: string
}

export const getOrganizationForUser =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ userEmail, slug }: GetOrganizationForUserArgs): Promise<Organization | null> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug: slug,
    })

    if (!profile) throw new Error("Forbidden")

    const organization = await mainRepository.organization.find({
      slug,
    })

    if (!organization) return null

    return organizationMapper(imageService).fromRepository(organization)
  }
