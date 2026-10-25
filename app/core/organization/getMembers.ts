import type { Profile } from "../profile/types"
import type { CoreContext } from "../types"
import type { PaginatedResult } from "~/repositories/main-repository/types"

interface GetOrganizationMembersArgs {
  userEmail: string
  slug: string
}

export const getOrganizationMembers =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({ userEmail, slug }: GetOrganizationMembersArgs): Promise<PaginatedResult<Profile>> => {
    const profile = await mainRepository.profile.find({
      organizationSlug: slug,
      userEmail,
    })

    if (!profile) throw new Error("Forbidden")

    // Everyone: names, avatars and counts need the whole organization.
    const profiles = await mainRepository.profile.findMany({ filter: { organizationSlug: slug } })

    return {
      ...profiles,
      data: await Promise.all(profiles.data.map(mappers.profile.fromRepository)),
    }
  }

/** The members of an organization — for a caller that has already checked membership. */
export const listOrganizationMembers =
  ({ mainRepository, mappers }: CoreContext) =>
  async (slug: string): Promise<PaginatedResult<Profile>> => {
    // Everyone: the office shows anyone's name, avatar and desk ("19 of 60"
    // was 60 members out of hundreds).
    const profiles = await mainRepository.profile.findMany({ filter: { organizationSlug: slug } })
    return {
      ...profiles,
      data: await Promise.all(profiles.data.map(mappers.profile.fromRepository)),
    }
  }
