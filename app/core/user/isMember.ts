import type { CoreContext } from "../types"

interface UserIsMemberArgs {
  userEmail: string
  organizationSlug: string
}

export const userIsMember =
  ({ mainRepository }: CoreContext) =>
  async ({ userEmail, organizationSlug }: UserIsMemberArgs): Promise<boolean> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug,
    })

    return !!profile
  }
