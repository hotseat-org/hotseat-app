import type { MainRepository } from "../../types"
import { toOrganization } from "./map"
import prisma from "~/services/prisma.server"

type FindOrganizationsFn = MainRepository["organization"]["findMany"]

export interface FindOrganizationsArgs {
  filter: {
    userEmail: string
  }
}

export const findManyOrganizations: FindOrganizationsFn = async ({ filter: { userEmail } }) => {
  const result = await prisma.organization.findMany({
    where: { profiles: { some: { userEmail } } },
  })

  return result.map(toOrganization)
}

/** A user's organizations with their role and the member count — one query. */
export const findOrganizationSummaries = async ({ userEmail }: { userEmail: string }) => {
  const rows = await prisma.profile.findMany({
    where: { userEmail },
    select: {
      role: true,
      organization: { include: { _count: { select: { profiles: true } } } },
    },
  })
  return rows.map(({ role, organization }) => ({
    ...toOrganization(organization),
    role,
    memberCount: organization._count.profiles,
  }))
}
