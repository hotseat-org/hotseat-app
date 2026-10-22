import { toOrganization } from "../organization/map"
import prisma from "~/services/prisma.server"

export interface FindOrganizationInvitesArgs {
  filter: {
    organizationSlug?: string
    email?: string
  }
}

export const findManyOrganizationInvites = async ({ filter }: FindOrganizationInvitesArgs) => {
  const result = await prisma.organizationInvite.findMany({
    where: {
      organizationSlug: filter.organizationSlug,
      // Emails match whatever their case.
      ...(filter.email && { email: { equals: filter.email, mode: "insensitive" as const } }),
    },
    include: { organization: true },
  })

  return result.map((i) => ({ ...i, organization: toOrganization(i.organization) }))
}
