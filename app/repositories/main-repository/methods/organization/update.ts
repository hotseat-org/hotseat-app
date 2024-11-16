import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"

type UpdateOrganizationFn = MainRepository["organization"]["update"]

export interface UpdateOrganizationArgs {
  slug: string
  data: {
    slug?: string
    name?: string
    description?: string
    thumbnail?: string | null
    invitationHash?: string
  }
}

export const updateOrganization: UpdateOrganizationFn = async ({ slug, data }) => {
  const result = await prisma.organization.update({
    where: { slug },
    data,
  })

  return {
    ...result,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    invitationHash: result.invitationHash ?? undefined,
  }
}
