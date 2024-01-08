import prisma from '~/services/prisma.server'

export interface DeleteProfileArgs {
  organizationSlug: string
  userEmail: string
}

export const deleteProfile = async ({
  organizationSlug,
  userEmail,
}: DeleteProfileArgs) => {
  const profile = await prisma.profile.delete({
    where: { userEmail_organizationSlug: { userEmail, organizationSlug } },
    include: { user: true },
  })

  return {
    ...profile,
    email: profile.userEmail,
    avatarUrl: profile.user.avatarUrl ?? undefined,
    displayName: profile.user.displayName ?? undefined,
  }
}
