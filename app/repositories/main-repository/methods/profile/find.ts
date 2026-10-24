import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"

type FindProfileFn = MainRepository["profile"]["find"]

export interface FindProfileArgs {
  userEmail: string
  organizationSlug: string
}

export const findProfile: FindProfileFn = async ({ userEmail, organizationSlug }) => {
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
    email: profile.userEmail,
    avatarUrl: profile.user.avatarUrl ?? undefined,
    pet: profile.user.pet ?? undefined,
    displayName: profile.user.displayName ?? undefined,
    createdAt: profile.createdAt,
  }
}
