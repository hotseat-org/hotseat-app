import { Office } from "../../types"
import prisma from "~/services/prisma.server"

export interface CreateOfficeArgs {
  slug: string
  name: string
  organizationSlug: string
  thumbnail: string
}

export const createOffice = async ({
  slug,
  name,
  organizationSlug,
  thumbnail,
}: CreateOfficeArgs): Promise<Office> => {
  const result = await prisma.office.create({
    data: { slug, name, organizationSlug, thumbnail },
  })

  return {
    ...result,
    spaceId: result.spaceId ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    description: result.description ?? undefined,
    layout: result.layout ?? undefined,
  }
}
