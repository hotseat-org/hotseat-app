import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type CreateProfileFn = MainRepository['profile']['create']

export interface CreateProfileArgs {
  email: string
  organizationSlug: string
  data: {
    displayName: string
    role: Role
    avatarUrl?: string
  }
}

export const createProfile: CreateProfileFn = async ({
  email,
  organizationSlug,
  data: { displayName, role, avatarUrl },
}) => {
  const profile = await prisma.profile.create({
    data: {
      userEmail: email,
      organizationSlug,
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
