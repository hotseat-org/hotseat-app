import prisma from '~/services/prisma.server'

export interface CreateOfficeArgs {
  slug: string
  name: string
  organizationSlug: string
  spaceUrl: string
}

export const createOffice = ({
  slug,
  name,
  organizationSlug,
  spaceUrl,
}: CreateOfficeArgs) => {
  const result = prisma.office.create({
    data: { slug, spaceUrl, name, organizationSlug },
  })

  return result
}
