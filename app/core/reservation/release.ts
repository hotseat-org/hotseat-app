import type { CoreContext } from "../types"
import { bookingContext } from "./context"
import { fillWaitlist } from "./preferences"
import { MAX_DAYS_PER_REQUEST, ReservationError } from "./types"
import { isDay, type Day } from "~/utils/booking"

export interface ReleaseArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  deskId: string
  dates: Day[]
}

/** The resident's own desk and the requested days, checked (today on, within the window). */
const residentDays = async (context: CoreContext, args: ReleaseArgs) => {
  const { today, lastDay, desks, isReleased } = await bookingContext(context, args)
  const desk = desks.find((d) => d.id === args.deskId)
  if (!desk || desk.assignee !== args.userEmail)
    throw new ReservationError("Only this desk's permanent resident can do that.")
  const dates = [...new Set(args.dates)].sort()
  if (!dates.length || dates.length > MAX_DAYS_PER_REQUEST || !dates.every(isDay))
    throw new ReservationError("Pick between 1 and 31 days.")
  if (dates[0] < today) throw new ReservationError("Days in the past can't be changed.")
  if (dates[dates.length - 1] > lastDay)
    throw new ReservationError("Days up to {day} can be changed.", { day: { day: lastDay } })
  return { dates, isReleased }
}

/**
 * A resident gives their desk up on days they're away: others can book it
 * then — first whoever's waiting for those days.
 */
export const releaseDesk =
  (context: CoreContext) =>
  async (args: ReleaseArgs): Promise<{ released: Day[] }> => {
    const { dates } = await residentDays(context, args)
    await context.mainRepository.deskRelease.create({ ...args, dates })
    await fillWaitlist(context)({ ...args, dates })
    return { released: dates }
  }

/**
 * A resident takes their desk back on given-up days — except days someone has
 * booked it meanwhile (reported back as taken).
 */
export const reclaimDesk =
  (context: CoreContext) =>
  async (
    args: ReleaseArgs
  ): Promise<{ reclaimed: Day[]; taken: { date: Day; userEmail: string }[] }> => {
    const { mainRepository } = context
    const { dates, isReleased } = await residentDays(context, args)
    const bookings = await mainRepository.reservation.findMany({
      filter: {
        organizationSlug: args.organizationSlug,
        officeSlug: args.officeSlug,
        deskId: args.deskId,
        dates,
      },
    })
    const taken = bookings.map((b) => ({ date: b.date as Day, userEmail: b.userEmail }))
    const reclaimed = dates.filter(
      (d) => isReleased(args.deskId, d) && !taken.some((t) => t.date === d)
    )
    if (reclaimed.length) await mainRepository.deskRelease.delete({ ...args, dates: reclaimed })
    return { reclaimed, taken }
  }

/** Days residents gave their desks up, for a range (members only). */
export const listDeskReleases =
  ({ mainRepository }: CoreContext) =>
  async (args: {
    organizationSlug: string
    officeSlug: string
    userEmail: string
    from: Day
    to: Day
  }) => {
    const profile = await mainRepository.profile.find({
      userEmail: args.userEmail,
      organizationSlug: args.organizationSlug,
    })
    if (!profile) throw new Error("Forbidden")
    const rows = await mainRepository.deskRelease.findMany({
      organizationSlug: args.organizationSlug,
      officeSlug: args.officeSlug,
      from: args.from,
      to: args.to,
    })
    return rows.map(({ deskId, date, userEmail }) => ({ deskId, date: date as Day, userEmail }))
  }
