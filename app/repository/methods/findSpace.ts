import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const findSpace =
  (prisma: PrismaClient): Repository['space']['find'] =>
  async (id) => {
    const result = await prisma.space.findUnique({
      where: { id },
      include: {
        seats: {
          include: {
            resident: { include: { photos: true } },
            reservations: { include: { by: { include: { photos: true } } } },
          },
        },
      },
    })

    if (!result) throw new Error('Not found')

    return {
      ...result,
      description: result.description ?? undefined,
    }
  }
