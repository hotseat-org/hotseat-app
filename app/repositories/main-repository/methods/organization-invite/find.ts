import type { MainRepository } from "../../types"
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
  const result = await prisma.organizationInvite.findUnique({
    where: { email_organizationSlug: { email, organizationSlug } },
  })

  return result
}
