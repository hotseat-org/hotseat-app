import { getCore } from "../get-core"
import type { CoreContext } from "../types"
import { officeSlugForName } from "./slug"
import type { Office } from "./types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface CreateOfficeArgs {
  name: string
  thumbnail: string
  organizationSlug: string
  userEmail: string
  /** IANA time zone (the creator's, from their browser); unset: the default. */
  timezone?: string
}

export const createOffice =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({
    name,
    userEmail,
    thumbnail,
    organizationSlug,
    timezone,
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

    const slug = officeSlugForName(name)

    const office = await mainRepository.office.create({
      name,
      organizationSlug,
      slug,
      thumbnail,
      timezone,
    })

    return mappers.office.fromRepository(office)
  }
