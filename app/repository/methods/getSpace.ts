import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const getSpace =
  (prisma: PrismaClient): Repository['getSpace'] =>
  async (id: string) => {
    const result = await prisma.space.findUnique({ where: { id } })

    if (!result) throw new Error('Not found')

    return {
      ...result,
      description: result.description ?? undefined,
    }
  }
