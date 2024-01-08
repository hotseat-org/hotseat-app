import dayjs from 'dayjs'
import { organizationMapper } from '../organization/mapper'
import type { CoreContext } from '../types'

export const getUserOrganizationInvites =
  ({ mainRepository, imageService, mappers }: CoreContext) =>
  async (email: string) => {
    const invites = await mainRepository.organizationInvite.findMany({
      filter: { email },
    })

    const activeInvites = invites.filter((invite) => {
      return dayjs(invite.expiresAt).isAfter(dayjs())
    })

    const mapper = organizationMapper(imageService)

    const result = await Promise.all(
      activeInvites.map(async (invite) => {
        const profiles = await mainRepository.profile.findMany({
          filter: { organizationSlug: invite.organizationSlug },
          pagination: { skip: 0, take: 4 },
        })

        const mappedOrganization = await mapper.fromRepository(
          invite.organization
        )

        return {
          ...invite,
          organization: {
            ...mappedOrganization,
            members: {
              ...profiles,
              data: await Promise.all(
                profiles.data.map(mappers.profile.fromRepository)
              ),
            },
          },
        }
      })
    )

    return result
  }
