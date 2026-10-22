import type { MainRepository } from "../../types"
import { toOrganization } from "../organization/map"
import prisma from "~/services/prisma.server"

type FindOrganizationInviteFn = MainRepository["organizationInvite"]["find"]

export interface FindOrganizationInviteArgs {
  email: string
  organizationSlug: string
}

export const findOrganizationInvite: FindOrganizationInviteFn = async ({
  email,
  organizationSlug,
}) => {
  // Emails match whatever their case (an invite to Bob@… is bob@…'s).
  const result = await prisma.organizationInvite.findFirst({
    where: { organizationSlug, email: { equals: email, mode: "insensitive" } },
    include: { organization: true },
  })

  return result && { ...result, organization: toOrganization(result.organization) }
}
