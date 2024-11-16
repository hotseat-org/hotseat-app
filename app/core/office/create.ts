import { Role } from "@prisma/client"
import slugify from "slugify"
import { getCore } from "../get-core"
import type { CoreContext } from "../types"
import type { Office } from "./types"

export interface CreateOfficeArgs {
  name: string
  spaceId: string
  thumbnail: string
  organizationSlug: string
  userEmail: string
}

export const createOffice =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    name,
    userEmail,
    spaceId,
    thumbnail,
    organizationSlug,
  }: CreateOfficeArgs): Promise<Office> => {
    const core = getCore()

    const profile = await mainRepository.profile.find({
      organizationSlug,
      userEmail,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const isAvailable = await core.office.isAvailable(name, organizationSlug)

    if (!isAvailable)
      throw new Error(`Office with name: ${name} already exists in this organization`)

    const slug = slugify(name, { lower: true, trim: true })

    const office = await mainRepository.office.create({
      name,
      organizationSlug,
      slug,
      spaceId,
      thumbnail,
    })

    return mappers.office.fromRepository(office)
  }
