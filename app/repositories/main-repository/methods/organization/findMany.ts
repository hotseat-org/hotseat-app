import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationsFn = MainRepository['organization']['findMany']

export interface FindOrganizationsArgs {
  filter: {
    userId: string
  }
}

export const findManyOrganizations: FindOrganizationsFn = async ({
  filter: { userId },
}) => {
  const result = await prisma.organization.findMany({
    where: { profiles: { some: { userId } } },
  })

  return result
}
