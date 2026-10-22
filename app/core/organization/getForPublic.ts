import type { CoreContext } from "../types"
import { organizationMapper } from "./mapper"
import type { Organization } from "./types"

/** By its URL slug, or by its universal invite code. */
type GetOrganizationForPublicArgs = { slug: string; hash?: never } | { hash: string; slug?: never }

export const getOrganizationForPublic =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ slug, hash }: GetOrganizationForPublicArgs): Promise<Organization | null> => {
    const organization = await mainRepository.organization.find(
      hash ? { invitationHash: hash } : { slug }
    )

    if (!organization) return null

    return organizationMapper(imageService).fromRepository(organization)
  }
