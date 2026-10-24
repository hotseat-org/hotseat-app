import type { CoreContext } from "../types"
import type { Day } from "~/utils/booking"

/** Someone's recent notifications (newest first) and how many are unread. */
export const listNotifications =
  ({ mainRepository }: CoreContext) =>
  (userEmail: string) =>
    mainRepository.notification.findMany({ userEmail, take: 20 })

export const markNotificationsRead =
  ({ mainRepository }: CoreContext) =>
  (userEmail: string) =>
    mainRepository.notification.markRead({ userEmail })

// ---- Wording, shared by everything that notifies ---------------------------

export const officeLink = (organizationSlug: string, officeSlug: string) =>
  `/app/o/${organizationSlug}/offices/${officeSlug}`

/** One notification per person and desk: their cancelled days, grouped. */
export const groupBookings = <T extends { userEmail: string; deskId: string; date: string }>(
  bookings: T[]
) => {
  const groups = new Map<string, { userEmail: string; deskId: string; days: Day[] }>()
  for (const b of bookings) {
    const key = `${b.userEmail}|${b.deskId}`
    const group = groups.get(key) ?? { userEmail: b.userEmail, deskId: b.deskId, days: [] }
    group.days.push(b.date as Day)
    groups.set(key, group)
  }
  return [...groups.values()]
}
