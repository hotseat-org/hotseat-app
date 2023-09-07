import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type FindOrganizationFn = MainRepository['organization']['find']

export interface FindOrganizationArgs {
  slug: string
}

export const findOrganization: FindOrganizationFn = async ({ slug }) => {
  const result = await prisma.organization.findUnique({
    where: { slug },
  })

  return result
}
