import prisma from "~/services/prisma.server"

/** Remember an organization's old slug (renamed to `slug`). */
export const addOrganizationSlugRedirect = async ({
  oldSlug,
  slug,
}: {
  oldSlug: string
  slug: string
}) => {
  await prisma.$transaction([
    prisma.organizationSlugRedirect.upsert({
      where: { oldSlug },
      create: { oldSlug, slug },
      update: { slug },
    }),
    // Renamed back to an earlier name: that slug is live again, not a redirect.
    prisma.organizationSlugRedirect.deleteMany({ where: { oldSlug: slug } }),
  ])
}

/** The current slug of an organization once called `oldSlug`, if any. */
export const findOrganizationSlugRedirect = async (oldSlug: string) =>
  (await prisma.organizationSlugRedirect.findUnique({ where: { oldSlug } }))?.slug ?? null

export const addOfficeSlugRedirect = async ({
  organizationSlug,
  oldSlug,
  slug,
}: {
  organizationSlug: string
  oldSlug: string
  slug: string
}) => {
  await prisma.$transaction([
    prisma.officeSlugRedirect.upsert({
      where: { organizationSlug_oldSlug: { organizationSlug, oldSlug } },
      create: { organizationSlug, oldSlug, slug },
      update: { slug },
    }),
    prisma.officeSlugRedirect.deleteMany({ where: { organizationSlug, oldSlug: slug } }),
  ])
}

export const findOfficeSlugRedirect = async (organizationSlug: string, oldSlug: string) =>
  (
    await prisma.officeSlugRedirect.findUnique({
      where: { organizationSlug_oldSlug: { organizationSlug, oldSlug } },
    })
  )?.slug ?? null
