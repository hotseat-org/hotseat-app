import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindProfilesFn = MainRepository['profile']['findMany']

export interface FindProfilesArgs {
  filter?: {
    organizationSlug: string
    role?: Role
  }
  pagination?: {
    take: number
    skip: number
  }
}

export const findProfiles: FindProfilesFn = async ({ filter, pagination }) => {
  const [totalCount, profiles] = await Promise.all([
    prisma.profile.count({ where: filter }),
    prisma.profile.findMany({
      where: filter,
      take: pagination?.take,
      skip: pagination?.skip,
      orderBy: { role: 'desc' },
      include: { user: true },
    }),
  ])

  return {
    take: pagination?.take ?? 0,
    skip: pagination?.skip ?? 0,
    totalCount,
    data: profiles.map((profile) => ({
      ...profile,
      email: profile.userEmail,
      avatarUrl: profile.user.avatarUrl ?? undefined,
      displayName: profile.user.displayName ?? undefined,
    })),
  }
}
