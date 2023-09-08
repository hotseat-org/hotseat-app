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
  const [user, organization] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.organization.findUniqueOrThrow({
      where: { slug: organizationSlug },
    }),
  ])

  const profile = await prisma.profile.findUnique({
    where: {
      userPK_organizationPK: {
        userPK: user.PK,
        organizationPK: organization.PK,
      },
    },
  })

  return profile
}
