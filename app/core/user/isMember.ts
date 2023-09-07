import type { CoreContext } from '../types'

interface UserIsMemberArgs {
  userId: string
  organizationSlug: string
}

export const userIsMember =
  ({ mainRepository }: CoreContext) =>
  async ({ userId, organizationSlug }: UserIsMemberArgs): Promise<boolean> => {
    const organization = await mainRepository.organization.find({
      userId,
      slug: organizationSlug,
    })

    return !!organization
  }
