import prisma from '~/services/prisma.server'
import { Office } from '../../types'

export interface CreateOfficeArgs {
  slug: string
  name: string
  organizationSlug: string
  spaceId: string
  thumbnail: string
}

export const createOffice = async ({
  slug,
  name,
  organizationSlug,
  spaceId,
  thumbnail,
}: CreateOfficeArgs): Promise<Office> => {
  const result = await prisma.office.create({
    data: { slug, spaceId, name, organizationSlug, thumbnail },
  })

  return {
    ...result,
    thumbnail: result.thumbnail ?? undefined,
    description: result.thumbnail ?? undefined,
  }
}
