import type { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type CreateProfileFn = MainRepository['profile']['create']

export interface CreateProfileArgs {
  userId: string
  organizationSlug: string
  data: {
    displayName: string
    role: Role
    avatarUrl?: string
  }
}

export const createProfile: CreateProfileFn = async ({
  userId,
  organizationSlug,
  data: { displayName, role, avatarUrl },
}) => {
  const profile = await prisma.profile.create({
    data: {
      userId,
      organizationSlug,
      displayName,
      role,
      avatarUrl,
    },
  })

  return {
    ...profile,
    avatarUrl: profile.avatarUrl ?? undefined,
  }
}
