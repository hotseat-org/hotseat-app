import prisma from '~/services/prisma.server'
import type { MainRepository } from '../../types'

type DeleteOrganizationInviteFn = MainRepository['organizationInvite']['delete']

export interface DeleteOrganizationInviteArgs {
  email: string
  organizationSlug: string
}

export const deleteOrganizationInvite: DeleteOrganizationInviteFn = async ({
  email,
  organizationSlug,
}) => {
  const result = await prisma.organizationInvite.delete({
    where: { email_organizationSlug: { email, organizationSlug } },
  })

  return result
}
