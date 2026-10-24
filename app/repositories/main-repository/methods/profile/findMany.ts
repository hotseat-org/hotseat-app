import type { MainRepository } from "../../types"
import type { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/client"
import prisma from "~/services/prisma.server"

type FindProfilesFn = MainRepository["profile"]["findMany"]

export interface FindProfilesArgs {
  filter?: {
    organizationSlug?: string
    userEmail?: string
    role?: Role
    /** Only memberships with a favourite office. */
    hasFavoriteOffice?: boolean
  }
  /** "role": admins first (default); "updated": most recently changed first. */
  order?: "role" | "updated"
  pagination?: {
    take: number
    skip: number
  }
}

export const findProfiles: FindProfilesFn = async ({ filter, order = "role", pagination }) => {
  const { hasFavoriteOffice, ...fields } = filter ?? {}
  const where = {
    ...fields,
    ...(hasFavoriteOffice !== undefined && {
      favoriteOfficeSlug: hasFavoriteOffice ? { not: null } : null,
    }),
  }
  const [totalCount, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      take: pagination?.take,
      skip: pagination?.skip,
      orderBy: order === "updated" ? { updatedAt: "desc" } : { role: "desc" },
      include: { user: true },
    }),
  ])

  return {
    take: pagination?.take ?? 0,
    skip: pagination?.skip ?? 0,
    totalCount,
    data: profiles.map((profile) => ({
      ...profile,
      email: profile.userEmail,
      avatarUrl: profile.user.avatarUrl ?? undefined,
      pet: profile.user.pet ?? undefined,
      displayName: profile.user.displayName ?? undefined,
    })),
  }
}
