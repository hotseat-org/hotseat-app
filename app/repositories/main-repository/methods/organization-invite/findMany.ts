import prisma from '~/services/prisma.server'

export interface FindOrganizationInvitesArgs {
  filter: {
    organizationSlug?: string
    email?: string
  }
}

export const findManyOrganizationInvites = async ({
  filter,
}: FindOrganizationInvitesArgs) => {
  const result = await prisma.organizationInvite.findMany({
    where: filter,
    include: { organization: true },
  })

  return result
}
