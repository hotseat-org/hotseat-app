import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../../types'

export const createUser =
  (prisma: PrismaClient): MainRepository['user']['create'] =>
  async ({ displayName, email, avatarUrl }) => {
    const result = await prisma.user.create({
      data: { displayName, email, avatarUrl },
    })

    return result
  }
