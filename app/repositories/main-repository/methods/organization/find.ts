import type { MainRepository } from "../../types"
import prisma from "~/services/prisma.server"
import type { Organization as OrganizationRow } from "~/repositories/main-repository/prisma/generated/prisma-client/client"

type FindOrganizationFn = MainRepository["organization"]["find"]

export interface FindOrganizationArgs {
  slug?: string
  invitationHash?: string
}

export const findOrganization: FindOrganizationFn = async ({ slug, invitationHash }) => {
  const result = await prisma.organization.findUnique({
    where: { slug, invitationHash },
  })

  return result && toOrganization(result)
}

/** The oldest organization (a self-hosted installation's only one), if any. */
export const findFirstOrganization: MainRepository["organization"]["findFirst"] = async () => {
  const result = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } })

  return result && toOrganization(result)
}

const toOrganization = (result: OrganizationRow) => ({
  name: result.name,
  slug: result.slug,
  description: result.description ?? undefined,
  thumbnail: result.thumbnail ?? undefined,
  invitationHash: result.invitationHash ?? undefined,
  allowedDomains: result.allowedDomains,
})
