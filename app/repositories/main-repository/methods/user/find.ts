import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"

type FindUserFn = MainRepository["user"]["find"]

export interface FindUserArgs {
  email: string
}

export const findUser: FindUserFn = async ({ email }) => {
  const result = await prisma.user.findUnique({
    where: { email },
  })

  return result
}
