import { Office } from "../../types"
import prisma from "~/services/prisma.server"

export interface DeleteOfficeArgs {
  slug: string
  organizationSlug: string
}

export const deleteOffice = async ({
  slug,
  organizationSlug,
}: DeleteOfficeArgs): Promise<Office> => {
  // Profiles pointing at it as their favourite would block the delete (that
  // composite FK is ON DELETE RESTRICT): clear them in the same transaction.
  const [, result] = await prisma.$transaction([
    prisma.profile.updateMany({
      where: { organizationSlug, favoriteOfficeSlug: slug },
      data: { favoriteOfficeSlug: null },
    }),
    prisma.office.delete({
      where: { organizationSlug_slug: { slug, organizationSlug } },
    }),
  ])

  return {
    ...result,
    spaceId: result.spaceId ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    description: result.description ?? undefined,
    layout: result.layout ?? undefined,
  }
}
