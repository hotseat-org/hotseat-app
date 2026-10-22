import type { CoreContext } from "../types"
import type { Office } from "./types"
import { layoutSchema } from "~/components/OfficeEditor/schema"
import { isSeatable } from "~/components/OfficeEditor/types"
import { deskState, groupBookings, todayIn } from "~/utils/booking"

export interface Occupancy {
  /** Desks in the office. */
  seats: number
  /** Desks someone has today — booked, or a resident who's in. */
  inToday: number
}

/**
 * How full each office is today (each by its own timezone's today) — for the
 * office switcher. Two queries for all of them.
 */
export const getOfficesOccupancy =
  ({ mainRepository }: CoreContext) =>
  async (organizationSlug: string, offices: Office[]): Promise<Record<string, Occupancy>> => {
    if (!offices.length) return {}
    const todays = new Map(offices.map((o) => [o.slug, todayIn(o.timezone)]))
    const days = [...new Set(todays.values())].sort()
    const [reservations, releases] = await Promise.all([
      mainRepository.reservation.findMany({ filter: { organizationSlug, dates: days } }),
      mainRepository.deskRelease.findMany({
        organizationSlug,
        from: days[0],
        to: days[days.length - 1],
      }),
    ])
    return Object.fromEntries(
      offices.map((office) => {
        const today = todays.get(office.slug) as string
        const parsed = layoutSchema.safeParse(office.layout ?? [])
        const desks = (parsed.success ? parsed.data : []).filter((o) => isSeatable(o.type))
        const here = (r: { officeSlug: string; date: string }) =>
          r.officeSlug === office.slug && r.date === today
        const byDay = groupBookings(reservations.filter(here))
        const released = groupBookings(releases.filter(here))
        const inToday = desks.filter(
          (desk) => deskState(desk, today, byDay, released).kind !== "free"
        ).length
        return [office.slug, { seats: desks.length, inToday }]
      })
    )
  }
