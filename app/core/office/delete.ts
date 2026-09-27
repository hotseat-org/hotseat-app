import type { CoreContext } from "../types"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

export interface DeleteOfficeArgs {
  slug: string
  organizationSlug: string
  userEmail: string
}

/** Delete an office and its layout (admins only). */
export const deleteOffice =
  ({ mainRepository }: CoreContext) =>
  async ({ slug, organizationSlug, userEmail }: DeleteOfficeArgs): Promise<void> => {
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
    if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")
    await mainRepository.office.delete({ slug, organizationSlug })
  }
