import prisma from '~/services/prisma.server'

export interface UpdateUserArgs {
  email: string
  data: {
    displayName?: string
    avatarUrl?: string
  }
}

export const updateUser = async ({ email, data }: UpdateUserArgs) => {
  const result = await prisma.user.update({
    where: { email },
    data,
  })

  return result
}
