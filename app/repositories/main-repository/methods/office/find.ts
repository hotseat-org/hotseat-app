import prisma from '~/services/prisma.server'

export interface FindOfficeArgs {
  filter: {
    organizationSlug: string
    slug: string
  }
}

export const findOffice = async ({
  filter: { organizationSlug, slug },
}: FindOfficeArgs) => {
  const result = await prisma.office.findUnique({
    where: { organizationSlug_slug: { organizationSlug, slug } },
  })

  return result
}
