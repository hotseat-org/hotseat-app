import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type UpdateProfileFn = MainRepository['profile']['update']

export interface UpdateProfileArgs {
  userEmail?: string
  organizationSlug?: string
  data: {
    displayName?: string
    role?: Role
    avatarUrl?: string
  }
}

export const updateProfile: UpdateProfileFn = async ({
  userEmail,
  organizationSlug,
  data: { displayName, role, avatarUrl },
}) => {
  const userEmail_organizationSlug =
    userEmail && organizationSlug ? { userEmail, organizationSlug } : undefined

  const profile = await prisma.profile.update({
    where: { userEmail, userEmail_organizationSlug },
    data: {
      displayName,
      role,
      avatarUrl,
    },
  })

  return {
    ...profile,
    email: profile.userEmail,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}
