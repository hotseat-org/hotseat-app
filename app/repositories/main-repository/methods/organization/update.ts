import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type UpdateOrganizationFn = MainRepository['organization']['update']

export interface UpdateOrganizationArgs {
  slug: string
  data: {
    slug?: string
    name?: string
    description?: string
    thumbnail?: string | null
  }
}

export const updateOrganization: UpdateOrganizationFn = async ({
  slug,
  data,
}) => {
  const result = await prisma.organization.update({
    where: { slug },
    data,
  })

  return {
    ...result,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
  }
}
