import type { CoreContext } from "../types"
import type { User } from "./types"

interface UpdateUserArgs {
  email: string
  data?: {
    displayName?: string
    avatarUrl?: string | null
  }
}

export const updateUser =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({ email, data }: UpdateUserArgs): Promise<User> => {
    const user = await mainRepository.user.find({ email })

    if (!user) throw new Error("User not found")
    if (!data) return user

    const seat = await mainRepository.user.update({
      email,
      data,
    })

    return mappers.user.fromRepository(seat)
  }
