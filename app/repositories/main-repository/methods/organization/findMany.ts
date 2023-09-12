import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationsFn = MainRepository['organization']['findMany']

export interface FindOrganizationsArgs {
  filter: {
    userEmail: string
  }
}

export const findManyOrganizations: FindOrganizationsFn = async ({
  filter: { userEmail },
}) => {
  const result = await prisma.organization.findMany({
    where: { profiles: { some: { userEmail } } },
  })

  return result
}
