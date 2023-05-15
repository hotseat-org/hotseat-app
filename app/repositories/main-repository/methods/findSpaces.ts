import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const findSpaces =
  (prisma: PrismaClient): MainRepository['space']['findMany'] =>
  async () => {
    const result = await prisma.space.findMany({
      include: {
        seats: {
          include: {
            space: { select: { id: true } },
            reservations: {
              include: {
                seat: { include: { space: { select: { id: true } } } },
              },
            },
          },
        },
      },
    })

    return result.map((result) => ({
      ...result,
      description: result.description ?? undefined,
    }))
  }
