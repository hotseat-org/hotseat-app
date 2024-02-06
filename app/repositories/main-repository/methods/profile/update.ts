import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type UpdateProfileFn = MainRepository['profile']['update']

export interface UpdateProfileArgs {
  userEmail?: string
  organizationSlug?: string
  data: {
    role?: Role
    favoriteOfficeSlug?: string | null
  }
}

export const updateProfile: UpdateProfileFn = async ({
  userEmail,
  organizationSlug,
  data: { role, favoriteOfficeSlug },
}) => {
  const userEmail_organizationSlug =
    userEmail && organizationSlug ? { userEmail, organizationSlug } : undefined

  const profile = await prisma.profile.update({
    where: { userEmail, userEmail_organizationSlug },
    data: {
      role,
      favoriteOfficeSlug,
    },
    include: { user: true, favoriteOffice: true },
  })

  return {
    ...profile,
    email: profile.userEmail,
    avatarUrl: profile.user.avatarUrl ?? undefined,
    displayName: profile.user.displayName ?? undefined,
  }
}
