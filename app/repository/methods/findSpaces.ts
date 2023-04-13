import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findSpaces =
  (prisma: PrismaClient): Repository['space']['findMany'] =>
  async () => {
    const result = await prisma.space.findMany({
      include: {
        seats: {
          include: {
            resident: { include: { photos: true } },
            reservations: { include: { by: { include: { photos: true } } } },
          },
        },
      },
    })

    return result.map((result) => ({
      ...result,
      description: result.description ?? undefined,
    }))
  }
