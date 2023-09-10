import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindProfileFn = MainRepository['profile']['find']

export interface FindProfileArgs {
  userId: string
  organizationSlug: string
}

export const findProfile: FindProfileFn = async ({
  userId,
  organizationSlug,
}) => {
  const profile = await prisma.profile.findUnique({
    where: {
      userId_organizationSlug: {
        userId,
        organizationSlug,
      },
    },
  })

  if (!profile) return null

  return {
    ...profile,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}
