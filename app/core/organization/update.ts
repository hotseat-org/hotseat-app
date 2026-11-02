import slugify from "slugify"
import type { CoreContext } from "../types"
import { organizationMapper } from "./mapper"
import type { Organization } from "./types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { LocalizedError } from "~/i18n/errors"

export interface UpdateOrganizationArgs {
  slug: string
  userEmail: string
  data: {
    name?: string
    thumbnail?: string | null
    description?: string
    allowedDomains?: string[]
  }
}

/** The slug an organization name maps to (same rule as on create). */
export const slugForName = (name: string) => slugify(name, { lower: true, trim: true })

/** Renaming to a name whose slug belongs to another organization. */
export class OrganizationNameTakenError extends LocalizedError {
  constructor(name: string) {
    super("An organization named “{name}” already exists", { name })
  }
}

export const updateOrganization =
  ({ mainRepository, imageService }: CoreContext) =>
  async ({ slug, userEmail, data }: UpdateOrganizationArgs): Promise<Organization> => {
    const profile = await mainRepository.profile.find({
      userEmail,
      organizationSlug: slug,
    })

    if (!profile) throw new Error("Forbidden")
    if (profile.role !== Role.ADMIN) throw new Error("Forbidden")

    // Renaming also renames the slug (the URL), like on create. The slug is the
    // org's primary key, but every FK referencing it is ON UPDATE CASCADE, so
    // profiles, offices and invites follow in the same statement.
    // Only an actual rename moves the URL (an org whose name and slug already
    // differ keeps its slug when just the description/logo is edited).
    const current = await mainRepository.organization.find({ slug })
    let newSlug: string | undefined
    if (data.name !== undefined && data.name.trim() !== current?.name.trim()) {
      const candidate = slugForName(data.name)
      if (!candidate) throw new Error("Invalid organization name")
      if (candidate !== slug) {
        if (await mainRepository.organization.find({ slug: candidate }))
          throw new OrganizationNameTakenError(data.name)
        newSlug = candidate
      }
    }

    const organization = await mainRepository.organization.update({
      slug,
      data: { ...data, ...(newSlug ? { slug: newSlug } : {}) },
    })
    // Old links (bookmarks, invite links) keep working.
    if (newSlug) await mainRepository.slugRedirect.addOrganization({ oldSlug: slug, slug: newSlug })

    return organizationMapper(imageService).fromRepository(organization)
  }
