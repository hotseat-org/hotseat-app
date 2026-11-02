import { Office } from "../../types"
import prisma from "~/services/prisma.server"

export interface CreateOfficeArgs {
  slug: string
  name: string
  organizationSlug: string
  thumbnail: string
  /** IANA time zone; unset: the database's default. */
  timezone?: string
}

export const createOffice = async ({
  slug,
  name,
  organizationSlug,
  thumbnail,
  timezone,
}: CreateOfficeArgs): Promise<Office> => {
  const result = await prisma.office.create({
    data: { slug, name, organizationSlug, thumbnail, timezone },
  })

  return {
    ...result,
    spaceId: result.spaceId ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    description: result.description ?? undefined,
    layout: result.layout ?? undefined,
  }
}
