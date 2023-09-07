import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

export const createUser: MainRepository['user']['create'] = async ({
  displayName,
  email,
  avatarUrl,
}) => {
  const result = await prisma.user.create({
    data: { displayName, email, avatarUrl },
  })

  return result
}
