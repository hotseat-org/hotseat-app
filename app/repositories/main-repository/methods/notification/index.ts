import type { Notification } from "../../types"
import prisma from "~/services/prisma.server"

export interface CreateNotificationsArgs {
  data: { userEmail: string; organizationSlug?: string; message: string; link?: string }[]
}

export const createNotifications = async ({ data }: CreateNotificationsArgs): Promise<void> => {
  if (data.length) await prisma.notification.createMany({ data })
}

export interface FindNotificationsArgs {
  userEmail: string
  take: number
}

/** Newest first, with how many are unread. */
export const findNotifications = async ({ userEmail, take }: FindNotificationsArgs) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userEmail },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.notification.count({ where: { userEmail, readAt: null } }),
  ])
  return { items: items as Notification[], unread }
}

export const markNotificationsRead = async ({ userEmail }: { userEmail: string }) => {
  await prisma.notification.updateMany({
    where: { userEmail, readAt: null },
    data: { readAt: new Date() },
  })
}
