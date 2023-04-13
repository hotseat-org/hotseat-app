import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findUsers =
  (prisma: PrismaClient): Repository['user']['findMany'] =>
  async () => {
    const result = await prisma.user.findMany({
      include: {
        photos: true,
      },
    })

    return result
  }
