import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationInvitesFn =
  MainRepository['organizationInvite']['findMany']

export interface FindOrganizationInvitesArgs {
  filter: {
    organizationSlug?: string
  }
}

export const findManyOrganizationInvites: FindOrganizationInvitesFn = async ({
  filter: { organizationSlug },
}) => {
  const result = await prisma.organizationInvite.findMany({
    where: { organizationSlug },
  })

  return result
}
