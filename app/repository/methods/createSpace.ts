import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const createSpace =
  (prisma: PrismaClient): Repository['createSpace'] =>
  async ({ name, spaceId }) => {
    const result = await prisma.space.create({
      data: {
        name,
        spaceId,
      },
    })

    return result
  }
