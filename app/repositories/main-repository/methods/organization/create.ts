import { Role } from '@prisma/client'
import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type CreateOrganizationFn = MainRepository['organization']['create']

export interface CreateOrganizationArgs {
  name: string
  slug: string
  creatorId: string
}

export const createOrganization: CreateOrganizationFn = async ({
  slug,
  name,
  creatorId,
}) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: creatorId } })

  const result = await prisma.organization.create({
    data: {
      name,
      slug,
      members: { connect: { id: creatorId } },
      profiles: {
        createMany: {
          data: [
            {
              displayName: user.displayName,
              role: Role.ADMIN,
              userId: creatorId,
            },
          ],
        },
      },
    },
  })

  return result
}
