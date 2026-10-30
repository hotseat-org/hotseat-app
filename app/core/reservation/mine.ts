import type { CoreContext } from "../types"
import { layoutSchema } from "~/office/schema"
import { isSeatable } from "~/office/catalog"
import { addDays, fromUtcDate, todayIn, type Day } from "~/utils/booking"

export interface MyBooking {
  officeSlug: string
  officeName: string
  deskId: string
  /** The desk's label ("B2"), if it has one. */
  deskLabel?: string
  date: Day
  /** The office's today (for "Today" labels). */
  today: Day
}

export interface MyPermanentDesk {
  officeSlug: string
  officeName: string
  deskId: string
  deskLabel?: string
}

export interface MyBookings {
  bookings: MyBooking[]
  permanent: MyPermanentDesk[]
}

/**
 * Your upcoming bookings in every office of an organization (today onwards,
 * judged in each office's timezone), plus the desks that are permanently yours.
 */
export const getMyBookings =
  ({ mainRepository }: CoreContext) =>
  async ({
    organizationSlug,
    userEmail,
  }: {
    organizationSlug: string
    userEmail: string
  }): Promise<MyBookings> => {
    const profile = await mainRepository.profile.find({ userEmail, organizationSlug })
    if (!profile) throw new Error("Forbidden")

    const [offices, rows] = await Promise.all([
      mainRepository.office.findMany({ filter: { organizationSlug } }),
      // A day of slack: offices ahead of UTC are already on "tomorrow".
      mainRepository.reservation.findMany({
        filter: { organizationSlug, userEmail, from: addDays(fromUtcDate(new Date()), -1) },
      }),
    ])

    const byOffice = new Map(
      offices.data.map((o) => {
        const parsed = layoutSchema.safeParse(o.layout ?? [])
        const desks = (parsed.success ? parsed.data : []).filter((d) => isSeatable(d.type))
        return [o.slug, { office: o, desks, today: todayIn(o.timezone) }]
      })
    )

    const bookings = rows.flatMap((r): MyBooking[] => {
      const entry = byOffice.get(r.officeSlug)
      if (!entry || r.date < entry.today) return []
      return [
        {
          officeSlug: r.officeSlug,
          officeName: entry.office.name,
          deskId: r.deskId,
          deskLabel: entry.desks.find((d) => d.id === r.deskId)?.label,
          date: r.date,
          today: entry.today,
        },
      ]
    })

    const permanent = [...byOffice.values()].flatMap(({ office, desks }) =>
      desks
        .filter((d) => d.assignee === userEmail)
        .map((d) => ({
          officeSlug: office.slug,
          officeName: office.name,
          deskId: d.id,
          deskLabel: d.label,
        }))
    )

    return { bookings, permanent }
  }
