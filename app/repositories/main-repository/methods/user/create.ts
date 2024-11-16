import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"

export const createUser: MainRepository["user"]["create"] = async ({
  displayName,
  email,
  avatarUrl,
}) => {
  const result = await prisma.user.create({
    data: { displayName, email, avatarUrl },
  })

  return result
}
