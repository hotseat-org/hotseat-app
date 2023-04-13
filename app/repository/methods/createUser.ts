import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const createUser =
  (prisma: PrismaClient): Repository['user']['create'] =>
  async ({ displayName, email, id, photos }) => {
    const result = await prisma.user.create({
      data: {
        id,
        email,
        displayName,
        photos: { createMany: { data: photos.map((url) => ({ url })) } },
      },
      include: { photos: true },
    })

    return result
  }
