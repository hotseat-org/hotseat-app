import type { CoreContext } from '../types'

interface UserIsMemberArgs {
  userId: string
  organizationSlug: string
}

export const userIsMember =
  ({ mainRepository }: CoreContext) =>
  async ({ userId, organizationSlug }: UserIsMemberArgs): Promise<boolean> => {
    const profile = await mainRepository.profile.find({
      userId,
      organizationSlug,
    })

    return !!profile
  }
