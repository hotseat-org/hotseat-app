import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export const createSpace =
  (prisma: PrismaClient): MainRepository['space']['create'] =>
  async ({ name, spaceId }) => {
    const result = await prisma.space.create({
      data: {
        name,
        spaceId,
      },
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

    return {
      ...result,
      description: result.description ?? undefined,
    }
  }
