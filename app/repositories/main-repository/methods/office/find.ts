import { Office } from "../../types"
import prisma from "~/services/prisma.server"

export interface FindOfficeArgs {
  filter: {
    organizationSlug: string
    slug: string
  }
}

export const findOffice = async ({
  filter: { organizationSlug, slug },
}: FindOfficeArgs): Promise<Office | null> => {
  const result = await prisma.office.findUnique({
    where: { organizationSlug_slug: { organizationSlug, slug } },
  })

  if (!result) return null

  return {
    ...result,
    spaceId: result.spaceId ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    description: result.description ?? undefined,
    layout: result.layout ?? undefined,
  }
}
