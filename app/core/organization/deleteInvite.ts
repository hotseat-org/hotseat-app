import { Role } from '@prisma/client'
import { organizationInviteMapper } from '../organization-invite/mapper'
import { type OrganizationInvite } from '../organization-invite/types'
import type { CoreContext } from '../types'

export interface DeleteOrganizationInviteArgs {
  email: string
  slug: string
  userId: string
}

export const deleteOrganizationInvite =
  ({ mainRepository }: CoreContext) =>
  async ({
    slug,
    userId,
    email,
  }: DeleteOrganizationInviteArgs): Promise<OrganizationInvite> => {
    const profile = await mainRepository.profile.find({
      userId,
      organizationSlug: slug,
    })

    if (!profile) throw new Error('Forbidden')
    if (profile.role !== Role.ADMIN) throw new Error('Forbidden')

    const invite = await mainRepository.organizationInvite.delete({
      email,
      organizationSlug: slug,
    })

    return organizationInviteMapper.fromRepository(invite)
  }
