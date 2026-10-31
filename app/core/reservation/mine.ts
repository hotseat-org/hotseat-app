import type { CoreContext } from "../types"
import { parseLayout } from "~/office/schema"
import { getFloorLabel, type FloorLabel } from "~/editor/core"
import { isSeatable } from "~/office/catalog"
import { addDays, fromUtcDate, todayIn, type Day } from "~/utils/booking"

export interface MyBooking {
  officeSlug: string
  officeName: string
  deskId: string
  /** The desk's label ("B2"), if it has one. */
  deskLabel?: string
  /** Its floor, in an office with more than one. */
  deskFloor?: FloorLabel
  date: Day
  /** The office's today (for "Today" labels). */
  today: Day
}

export interface MyPermanentDesk {
  officeSlug: string
  officeName: string
  deskId: string
  deskLabel?: string
  deskFloor?: FloorLabel
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
        const { floors, pieces } = parseLayout(o.layout)
        const desks = pieces.filter((d) => isSeatable(d.type))
        return [o.slug, { office: o, floors, desks, today: todayIn(o.timezone) }]
      })
    )

    const bookings = rows.flatMap((r): MyBooking[] => {
      const entry = byOffice.get(r.officeSlug)
      if (!entry || r.date < entry.today) return []
      const desk = entry.desks.find((d) => d.id === r.deskId)
      return [
        {
          officeSlug: r.officeSlug,
          officeName: entry.office.name,
          deskId: r.deskId,
          deskLabel: desk?.label,
          deskFloor: desk && getFloorLabel(entry.floors, desk),
          date: r.date,
          today: entry.today,
        },
      ]
    })

    const permanent = [...byOffice.values()].flatMap(({ office, floors, desks }) =>
      desks
        .filter((d) => d.assignee === userEmail)
        .map((d) => ({
          officeSlug: office.slug,
          officeName: office.name,
          deskId: d.id,
          deskLabel: d.label,
          deskFloor: getFloorLabel(floors, d),
        }))
    )

    return { bookings, permanent }
  }
