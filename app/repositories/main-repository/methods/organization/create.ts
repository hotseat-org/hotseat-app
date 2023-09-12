import { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type CreateOrganizationFn = MainRepository['organization']['create']

export interface CreateOrganizationArgs {
  name: string
  slug: string
  creatorEmail: string
  invitationHash: string
}

export const createOrganization: CreateOrganizationFn = async ({
  slug,
  name,
  creatorEmail,
  invitationHash,
}) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: creatorEmail },
  })

  const result = await prisma.organization.create({
    data: {
      name,
      slug,
      invitationHash,
      profiles: {
        createMany: {
          data: [
            {
              displayName: user.displayName,
              role: Role.ADMIN,
              userEmail: creatorEmail,
            },
          ],
        },
      },
    },
  })

  return {
    ...result,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    invitationHash: result.invitationHash ?? undefined,
  }
}
