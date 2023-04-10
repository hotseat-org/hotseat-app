import type { PrismaClient } from '@prisma/client'
import type { Repository } from '../types'

export const getSpaces =
  (prisma: PrismaClient): Repository['getSpaces'] =>
  async () => {
    const result = await prisma.space.findMany()

    return result.map((result) => ({
      ...result,
      description: result.description ?? undefined,
    }))
  }
