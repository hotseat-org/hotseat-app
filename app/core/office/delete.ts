import type { CoreContext } from "../types"
import { todayIn, type Day } from "~/utils/booking"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import { encodeNotification } from "~/i18n/notifications"

export interface DeleteOfficeArgs {
  slug: string
  organizationSlug: string
  userEmail: string
}

/** Delete an office and its layout (admins only); people who had bookings in it are told. */
export const deleteOffice =
  ({ mainRepository }: CoreContext) =>
  async ({ slug, organizationSlug, userEmail }: DeleteOfficeArgs): Promise<void> => {
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
    if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")
    const office = await mainRepository.office.find({ filter: { organizationSlug, slug } })
    if (!office) return
    // Upcoming bookings go with it (FK cascade) — their owners are told.
    const lost = await mainRepository.reservation.findMany({
      filter: { organizationSlug, officeSlug: slug, from: todayIn(office.timezone) },
    })
    await mainRepository.office.delete({ slug, organizationSlug })

    const byPerson = new Map<string, Day[]>()
    for (const r of lost)
      byPerson.set(r.userEmail, [...(byPerson.get(r.userEmail) ?? []), r.date as Day])
    await mainRepository.notification.create({
      data: [...byPerson]
        .filter(([email]) => email !== userEmail)
        .map(([email, days]) => ({
          userEmail: email,
          organizationSlug,
          message: encodeNotification("{office} was deleted, with your booking on {days}.", {
            office: office.name,
            days: { days },
          }),
          link: `/app/o/${organizationSlug}`,
        })),
    })
  }
