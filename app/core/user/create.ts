import type { CoreContext } from "../types"
import type { User } from "./types"

interface CreateUserArgs {
  email: string
  displayName: string
  avatarUrl?: string
}

export const createUser =
  ({ mainRepository, imageService, mappers }: CoreContext) =>
  async ({ email, displayName, avatarUrl }: CreateUserArgs): Promise<User> => {
    // Their sign-in photo, kept as one of ours (a photo that fails to copy: none).
    const avatar = avatarUrl
      ? await imageService.importFromUrl(avatarUrl).catch(() => undefined)
      : undefined

    const user = await mainRepository.user.create({
      email,
      displayName,
      avatarUrl: avatar,
    })

    return mappers.user.fromRepository(user)
  }
