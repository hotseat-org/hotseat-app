import { Office } from "../../types"
import prisma from "~/services/prisma.server"
import { Prisma } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

export interface UpdateOfficeArgs {
  organizationSlug: string
  slug: string
  data: {
    layout?: unknown
    name?: string
    /** Renaming moves the URL; FKs referencing it are ON UPDATE CASCADE. */
    slug?: string
    description?: string | null
    thumbnail?: string | null
    timezone?: string
    openWeekdays?: number[]
  }
}

export const updateOffice = async ({
  organizationSlug,
  slug,
  data,
}: UpdateOfficeArgs): Promise<Office> => {
  const result = await prisma.office.update({
    where: { organizationSlug_slug: { organizationSlug, slug } },
    data: {
      ...(data.layout !== undefined ? { layout: data.layout as Prisma.InputJsonValue } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.slug !== undefined ? { slug: data.slug } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.thumbnail !== undefined ? { thumbnail: data.thumbnail } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.openWeekdays !== undefined ? { openWeekdays: data.openWeekdays } : {}),
    },
  })

  return {
    ...result,
    spaceId: result.spaceId ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    description: result.description ?? undefined,
    layout: result.layout ?? undefined,
  }
}
