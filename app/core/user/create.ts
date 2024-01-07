import type { CoreContext } from '../types'
import type { User } from './types'

interface CreateUserArgs {
  email: string
  displayName: string
  avatarUrl?: string
}

export const createUser =
  ({ mainRepository, imageService, mappers }: CoreContext) =>
  async ({ email, displayName, avatarUrl }: CreateUserArgs): Promise<User> => {
    const { uploadUrl } = await imageService.getUploadUrl()

    let avatar = undefined

    if (avatarUrl) {
      const body = new FormData()

      body.append('url', avatarUrl)
      const uploadResult = await fetch(uploadUrl, {
        method: 'POST',
        body,
      }).then((res) => res.json())

      avatar = uploadResult.result.id
    }

    const user = await mainRepository.user.create({
      email,
      displayName,
      avatarUrl: avatar,
    })

    return mappers.user.fromRepository(user)
  }
