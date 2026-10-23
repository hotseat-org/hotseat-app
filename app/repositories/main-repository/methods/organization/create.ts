import type { MainRepository } from "../../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import prisma from "~/services/prisma.server"

type CreateOrganizationFn = MainRepository["organization"]["create"]

export interface CreateOrganizationArgs {
  name: string
  slug: string
  creatorEmail: string
  invitationHash: string
  /** Logo (an uploaded image id). */
  thumbnail?: string
}

export const createOrganization: CreateOrganizationFn = async ({
  slug,
  name,
  creatorEmail,
  invitationHash,
  thumbnail,
}) => {
  const result = await prisma.organization.create({
    data: {
      name,
      slug,
      invitationHash,
      thumbnail,
      profiles: {
        createMany: {
          data: [
            {
              role: Role.ADMIN,
              userEmail: creatorEmail,
            },
          ],
        },
      },
    },
  })

  return {
    ...result,
    description: result.description ?? undefined,
    thumbnail: result.thumbnail ?? undefined,
    invitationHash: result.invitationHash ?? undefined,
  }
}
