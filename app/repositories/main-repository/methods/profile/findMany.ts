import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindProfilesFn = MainRepository['profile']['findMany']

export interface FindProfilesArgs {
  filter?: {
    organizationSlug: string
  }
}

export const findProfiles: FindProfilesFn = async ({ filter }) => {
  const profiles = await prisma.profile.findMany({
    where: filter,
    orderBy: { role: 'desc' },
    include: { user: true },
  })

  return profiles.map((profile) => ({
    ...profile,
    email: profile.user.email,
    avatarUrl: profile.avatarUrl ?? undefined,
  }))
}
