import prisma from '~/services/prisma.server'

export interface DeleteOfficeArgs {
  slug: string
  organizationSlug: string
}

export const deleteOffice = async ({
  slug,
  organizationSlug,
}: DeleteOfficeArgs) => {
  const result = await prisma.office.delete({
    where: { organizationSlug_slug: { slug, organizationSlug } },
  })

  return result
}
