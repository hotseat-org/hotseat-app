import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type DeleteOrganizationFn = MainRepository['organization']['delete']

export interface DeleteOrganizationArgs {
  slug: string
}

export const deleteOrganization: DeleteOrganizationFn = async ({ slug }) => {
  const result = await prisma.organization.delete({
    where: { slug },
  })

  return result
}
