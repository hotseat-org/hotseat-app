import type { CoreContext } from "../types"
import { officeSlugForName } from "./slug"
import type { Office } from "./types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface UpdateOfficeArgs {
  slug: string
  organizationSlug: string
  userEmail: string
  data: {
    name?: string
    description?: string | null
    thumbnail?: string | null
  }
}

export { officeSlugForName }

/** Renaming to a name whose slug another office in the org already has. */
export class OfficeNameTakenError extends Error {
  constructor(name: string) {
    super(`An office named "${name}" already exists`)
  }
}

/**
 * Edit an office's details (admins only). Like organizations, renaming also
 * renames the slug (the URL) — only on an actual name change. The office's key
 * is (organizationSlug, slug) and the favourite-office FK is ON UPDATE CASCADE.
 */
export const updateOffice =
  ({ mainRepository, mappers }: CoreContext) =>
  async ({ slug, organizationSlug, userEmail, data }: UpdateOfficeArgs): Promise<Office> => {
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
    if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")

    const current = await mainRepository.office.find({ filter: { slug, organizationSlug } })
    if (!current) throw new Error("Not Found")

    let newSlug: string | undefined
    if (data.name !== undefined && data.name.trim() !== current.name.trim()) {
      const candidate = officeSlugForName(data.name)
      if (!candidate) throw new Error("Invalid office name")
      if (candidate !== slug) {
        if (await mainRepository.office.find({ filter: { slug: candidate, organizationSlug } }))
          throw new OfficeNameTakenError(data.name)
        newSlug = candidate
      }
    }

    const office = await mainRepository.office.update({
      slug,
      organizationSlug,
      data: { ...data, ...(newSlug ? { slug: newSlug } : {}) },
    })
    // Old links keep working.
    if (newSlug)
      await mainRepository.slugRedirect.addOffice({
        organizationSlug,
        oldSlug: slug,
        slug: newSlug,
      })
    return mappers.office.fromRepository(office)
  }
