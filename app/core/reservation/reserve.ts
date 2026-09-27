import { randomUUID } from "node:crypto"
import type { CoreContext } from "../types"
import { bookingContext } from "./context"
import { MAX_DAYS_PER_REQUEST, ReservationError, ReservationRaceError } from "./types"
import { formatLong, isDay, type Day } from "~/utils/booking"

export interface ReserveArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  deskId: string
  dates: Day[]
  /** Book for another member (admins only). */
  forEmail?: string
}

export interface ReserveResult {
  booked: Day[]
  conflicts: { date: Day; userEmail: string }[]
}

/**
 * Book one desk for one or more days. Days someone else already has are
 * skipped and reported back ("Thu is taken by Eva"), the rest are booked.
 * Booking moves the person: their other desk on those days is released.
 */
export const reserveDesk =
  (context: CoreContext) =>
  async (args: ReserveArgs): Promise<ReserveResult> => {
    const { mainRepository } = context
    const { organizationSlug, officeSlug, deskId, userEmail } = args
    const { targetEmail, today, lastDay, desks } = await bookingContext(context, args)

    const dates = [...new Set(args.dates)].sort()
    if (!dates.length || dates.length > MAX_DAYS_PER_REQUEST || !dates.every(isDay))
      throw new ReservationError("Pick between 1 and 31 days.")
    if (dates[0] < today) throw new ReservationError("Days in the past can't be booked.")
    if (dates[dates.length - 1] > lastDay)
      throw new ReservationError(`Desks can be booked up to ${formatLong(lastDay)}.`)

    const desk = desks.find((d) => d.id === deskId)
    if (!desk) throw new ReservationError("This desk no longer exists.")
    if (desk.assignee) {
      if (desk.assignee === targetEmail)
        throw new ReservationError("This is already your permanent desk.")
      const resident = await mainRepository.profile.find({
        userEmail: desk.assignee,
        organizationSlug,
      })
      throw new ReservationError(
        `This is ${resident?.displayName ?? "someone"}'s permanent desk, so it can't be booked.`
      )
    }
    if (desks.some((d) => d.assignee === targetEmail))
      throw new ReservationError("You already have a permanent desk in this office.")

    try {
      return await mainRepository.reservation.book({
        organizationSlug,
        officeSlug,
        deskId,
        userEmail: targetEmail,
        createdByEmail: userEmail,
        dates,
        seriesId: dates.length > 1 ? randomUUID() : null,
      })
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") throw new ReservationRaceError()
      throw error
    }
  }
