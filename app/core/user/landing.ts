import type { CoreContext } from "../types"

/**
 * Where someone lands when they open the app: their favourite office (the one
 * chosen last, if they have one in several organizations), else their first
 * organization's first office — one redirect straight there, not a chain
 * (/ → /app → /app/o/… → …/offices → the office), each hop of which ran every
 * layout's loader. No organization yet: the welcome page.
 */
export const getUserLanding =
  ({ mainRepository }: CoreContext) =>
  async (userEmail: string): Promise<string> => {
    const favorites = await mainRepository.profile.findMany({
      filter: { userEmail, hasFavoriteOffice: true },
      order: "updated",
      pagination: { take: 1, skip: 0 },
    })
    const [favorite] = favorites.data
    if (favorite?.favoriteOfficeSlug)
      return `/app/o/${favorite.organizationSlug}/offices/${favorite.favoriteOfficeSlug}`
    const [organization] = await mainRepository.organization.findMany({ filter: { userEmail } })
    if (!organization) return "/app"
    return organizationLanding(mainRepository, userEmail, organization.slug)
  }

/** An organization's landing page for someone: their favourite office, else the first. */
export const getOrganizationLanding =
  ({ mainRepository }: CoreContext) =>
  (userEmail: string, organizationSlug: string) =>
    organizationLanding(mainRepository, userEmail, organizationSlug)

const organizationLanding = async (
  mainRepository: CoreContext["mainRepository"],
  userEmail: string,
  organizationSlug: string
): Promise<string> => {
  const base = `/app/o/${organizationSlug}/offices`
  const [profile, offices] = await Promise.all([
    mainRepository.profile.find({ userEmail, organizationSlug }),
    mainRepository.office.findMany({
      filter: { organizationSlug },
      pagination: { take: 1, skip: 0 },
    }),
  ])
  const officeSlug = profile?.favoriteOfficeSlug ?? offices.data[0]?.slug
  return officeSlug ? `${base}/${officeSlug}` : base
}
