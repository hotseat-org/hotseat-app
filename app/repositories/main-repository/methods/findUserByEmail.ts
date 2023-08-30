import type { PrismaClient } from '@prisma/client'
import type { MainRepository } from '../types'

export interface FindUserArgs {
  email: string
}

export const findUserByEmail =
  (prisma: PrismaClient): MainRepository['user']['findByEmail'] =>
  async ({ email }) => {
    const result = await prisma.user.findUnique({
      where: { email },
    })

    return result
  }
