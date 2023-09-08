import { Role } from '@prisma/client'
import type { CoreContext } from '../types'
import type { Organization } from './types'

export interface DeleteOrganizationArgs {
  slug: string
  userId: string
}

export const deleteOrganization =
  ({ mainRepository }: CoreContext) =>
  async ({ slug, userId }: DeleteOrganizationArgs): Promise<Organization> => {
    const profile = await mainRepository.profile.find({
      userId,
      organizationSlug: slug,
    })
    console.log(profile)
    if (!profile) throw new Error('Forbidden')
    // * TODO: Use core or repository Enums
    if (profile.role !== Role.ADMIN) throw new Error('Forbidden')

    return mainRepository.organization.delete({ slug })
  }
