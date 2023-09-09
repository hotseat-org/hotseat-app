import type { Prisma } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationFn = MainRepository['organization']['find']

export interface FindOrganizationArgs {
  slug: string
  userId?: string
}

const getUserFilter = (userId: string): Prisma.UserListRelationFilter => ({
  some: { id: userId },
})

export const findOrganization: FindOrganizationFn = async ({
  slug,
  userId,
}) => {
  const members = userId ? getUserFilter(userId) : undefined

  const result = await prisma.organization.findUnique({
    where: { slug, members },
  })

  if (!result) return null

  return {
    name: result.name,
    slug: result.slug,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
  }
}
