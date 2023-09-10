import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationFn = MainRepository['organization']['find']

export interface FindOrganizationArgs {
  slug?: string
  invitationHash?: string
}

export const findOrganization: FindOrganizationFn = async ({
  slug,
  invitationHash,
}) => {
  const result = await prisma.organization.findUnique({
    where: { slug, invitationHash },
  })

  if (!result) return null

  return {
    name: result.name,
    slug: result.slug,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    invitationHash: result.invitationHash ?? undefined,
  }
}
