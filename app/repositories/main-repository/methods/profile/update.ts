import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type UpdateProfileFn = MainRepository['profile']['update']

export interface UpdateProfileArgs {
  id?: string
  userId?: string
  organizationSlug?: string
  data: {
    displayName?: string
    role?: Role
    avatarUrl?: string
  }
}

export const updateProfile: UpdateProfileFn = async ({
  id,
  userId,
  organizationSlug,
  data: { displayName, role, avatarUrl },
}) => {
  const userId_organizationSlug =
    userId && organizationSlug ? { userId, organizationSlug } : undefined

  const profile = await prisma.profile.update({
    where: { id, userId_organizationSlug },
    data: {
      displayName,
      role,
      avatarUrl,
    },
    include: { user: true },
  })

  return {
    ...profile,
    email: profile.user.email,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}
