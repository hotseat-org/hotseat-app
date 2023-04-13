import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findUser =
  (prisma: PrismaClient): Repository['user']['find'] =>
  async (id) => {
    const result = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: true,
      },
    })

    return result
  }
