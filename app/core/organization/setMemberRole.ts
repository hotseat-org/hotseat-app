import { Role } from '@prisma/client'
import type { MainRepository } from '~/repositories/main-repository/types'
import type { Profile } from '../profile/types'
import type { CoreContext } from '../types'

export interface SetOrganizationMemberRoleArgs {
  userId: string
  slug: string
  otherUserId: string
  role: Role
}

const requireAdminInOrganization = async (
  mainRepository: MainRepository,
  userId: string,
  slug: string
) => {
  const profile = await mainRepository.profile.find({
    userId,
    organizationSlug: slug,
  })

  if (!profile) throw new Error('Forbidden')
  if (profile.role !== Role.ADMIN) throw new Error('Forbidden')

  return profile
}

export const setOrganizationMemberRole =
  ({ mainRepository }: CoreContext) =>
  async ({
    slug,
    userId,
    otherUserId,
    role,
  }: SetOrganizationMemberRoleArgs): Promise<Profile> => {
    await requireAdminInOrganization(mainRepository, userId, slug)

    const members = await mainRepository.profile.findMany({
      filter: { organizationSlug: slug },
    })

    const currentProfile = await mainRepository.profile.find({
      userId: otherUserId,
      organizationSlug: slug,
    })

    if (!currentProfile) {
      throw new Error('User is not a member of your organization')
    }

    const currentRole = currentProfile.role

    // * When user is demoted from admin to user, ensure there is always at least one admin
    // * TLDR: if you are the only admin, you can't demote yourself to user
    if (currentRole === Role.ADMIN && role === Role.USER) {
      const adminsCount = members.filter(
        (member) => member.role === Role.ADMIN
      ).length

      if (adminsCount < 2) {
        throw new Error('There always needs to be at least one admin')
      }
    }

    const profile = await mainRepository.profile.update({
      organizationSlug: slug,
      userId: otherUserId,
      data: {
        role,
      },
    })

    return profile
  }
