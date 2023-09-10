import { Role } from '@prisma/client'
import dayjs from 'dayjs'
import { organizationInviteMapper } from '../organization-invite/mapper'
import type { OrganizationInvite } from '../organization-invite/types'
import type { CoreContext } from '../types'

export interface OrganizationInviteMemberArgs {
  userId: string
  slug: string
  data: {
    email: string
  }
}

export const organizationInviteMember =
  ({ mainRepository }: CoreContext) =>
  async ({
    userId,
    slug,
    data,
  }: OrganizationInviteMemberArgs): Promise<OrganizationInvite> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userId,
    })

    if (!profile) throw new Error('Forbidden')
    if (profile.role !== Role.ADMIN) throw new Error('Forbidden')

    const invitedUser = await mainRepository.user.find({ email: data.email })

    if (invitedUser) {
      const invitedUserProfile = await mainRepository.profile.find({
        organizationSlug: slug,
        userId: invitedUser.id,
      })

      if (invitedUserProfile) {
        throw new Error(
          'User with this email is already member of this organization'
        )
      }
    }

    const expiresAt = dayjs().add(7, 'days').toDate()

    const invite = await mainRepository.organizationInvite.create({
      email: data.email,
      organizationSlug: slug,
      expiresAt,
    })

    return organizationInviteMapper.fromRepository(invite)
  }
