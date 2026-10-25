import type { RoomKit } from "../../types"
import prisma from "~/services/prisma.server"

/** The organization's saved rooms, newest first. */
export const findRoomKits = async (organizationSlug: string): Promise<RoomKit[]> =>
  prisma.roomKit.findMany({ where: { organizationSlug }, orderBy: { createdAt: "desc" } })

export const createRoomKit = async (kit: Omit<RoomKit, "createdAt">) => {
  await prisma.roomKit.create({ data: { ...kit, objects: kit.objects as object } })
}

export const deleteRoomKit = async ({
  organizationSlug,
  id,
}: {
  organizationSlug: string
  id: string
}) => {
  await prisma.roomKit.deleteMany({ where: { organizationSlug, id } })
}
