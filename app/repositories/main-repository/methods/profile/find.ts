import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindProfileFn = MainRepository['profile']['find']

export interface FindProfileArgs {
  userEmail: string
  organizationSlug: string
}

export const findProfile: FindProfileFn = async ({
  userEmail,
  organizationSlug,
}) => {
  const profile = await prisma.profile.findUnique({
    where: {
      userEmail_organizationSlug: {
        userEmail,
        organizationSlug,
      },
    },
    include: { user: true },
  })

  if (!profile) return null

  return {
    ...profile,
    email: profile.user.email,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}
