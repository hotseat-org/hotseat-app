import type { CoreContext } from "../types"
import { roomKitSchema } from "~/office/schema"
import { type Kit } from "~/editor/core"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"

/**
 * Saved rooms ("kits"): rooms an admin saved in the editor, to place again in
 * any of the organization's offices. Shared by the organization's admins.
 */
export const listRoomKits =
  ({ mainRepository }: CoreContext) =>
  async (organizationSlug: string): Promise<Kit[]> => {
    const rows = await mainRepository.roomKit.findMany(organizationSlug)
    // A row that no longer fits the layout format is left out, not fatal.
    return rows.flatMap((row) => {
      const parsed = roomKitSchema.safeParse(row)
      return parsed.success ? [parsed.data] : []
    })
  }

const requireAdmin = async (
  { mainRepository }: CoreContext,
  organizationSlug: string,
  userEmail: string
) => {
  const profile = await mainRepository.profile.find({ organizationSlug, userEmail })
  if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")
}

export const saveRoomKit =
  (context: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
    kit,
  }: {
    organizationSlug: string
    userEmail: string
    kit: unknown
  }) => {
    await requireAdmin(context, organizationSlug, userEmail)
    const parsed = roomKitSchema.parse(kit)
    await context.mainRepository.roomKit.create({
      ...parsed,
      organizationSlug,
      createdBy: userEmail,
    })
  }

export const deleteRoomKit =
  (context: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
    id,
  }: {
    organizationSlug: string
    userEmail: string
    id: string
  }) => {
    await requireAdmin(context, organizationSlug, userEmail)
    await context.mainRepository.roomKit.delete({ organizationSlug, id })
  }
