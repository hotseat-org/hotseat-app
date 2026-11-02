import type { Organization } from "./types"
import type { Organization as RepositoryOrganization } from "~/repositories/main-repository/types"
import type { ImageService } from "~/services/images/types"

export const organizationMapper = (imageService: ImageService) => ({
  fromRepository: async ({
    name,
    slug,
    description,
    thumbnail,
    invitationHash,
    allowedDomains,
  }: RepositoryOrganization): Promise<Organization> => ({
    name,
    slug,
    description,
    invitationHash,
    allowedDomains,
    thumbnailUrl: thumbnail && (await imageService.getSignedUrl(thumbnail, "thumbnail")),
  }),
})
