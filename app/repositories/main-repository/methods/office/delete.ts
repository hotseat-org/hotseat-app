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
  const result = await prisma.office.delete({
    where: { organizationSlug_slug: { slug, organizationSlug } },
  })

  return {
    ...result,
    thumbnail: result.thumbnail ?? undefined,
    description: result.thumbnail ?? undefined,
  }
}
