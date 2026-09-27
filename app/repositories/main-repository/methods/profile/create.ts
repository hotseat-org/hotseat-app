import type { MainRepository } from "../../types"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import prisma from "~/services/prisma.server"

type CreateProfileFn = MainRepository["profile"]["create"]

export interface CreateProfileArgs {
  email: string
  organizationSlug: string
  data: {
    role: Role
  }
}

export const createProfile: CreateProfileFn = async ({
  email,
  organizationSlug,
  data: { role },
}) => {
  const profile = await prisma.profile.create({
    data: {
      userEmail: email,
      organizationSlug,
      role,
    },
    include: { user: true },
  })

  return {
    ...profile,
    email: profile.userEmail,
    avatarUrl: profile.user.avatarUrl ?? undefined,
    displayName: profile.user.displayName ?? undefined,
  }
}
