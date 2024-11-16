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
  }: RepositoryOrganization): Promise<Organization> => ({
    name,
    slug,
    description,
    invitationHash,
    thumbnailUrl: thumbnail && (await imageService.getSignedUrl(thumbnail, "thumbnail")),
  }),
})
