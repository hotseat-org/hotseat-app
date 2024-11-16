import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"

type CreateOrganizationFn = MainRepository["organizationInvite"]["create"]

export interface CreateOrganizationInviteArgs {
  email: string
  expiresAt: Date
  organizationSlug: string
}

export const createOrganizationInvite: CreateOrganizationFn = async ({
  email,
  expiresAt,
  organizationSlug,
}) => {
  const result = await prisma.organizationInvite.create({
    data: {
      email,
      expiresAt,
      organizationSlug,
    },
  })

  return result
}
