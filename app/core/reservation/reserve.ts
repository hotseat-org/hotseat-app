import { randomUUID } from "node:crypto"
import type { CoreContext } from "../types"
import { bookingContext } from "./context"
import { MAX_DAYS_PER_REQUEST, ReservationError, ReservationRaceError } from "./types"
import { isDay, type Day } from "~/utils/booking"
import { msg } from "~/i18n/msg"

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
 * Booking moves the person: their other desk on those days is released. Having
 * a desk, they leave the waitlist for those days.
 */
export const reserveDesk =
  (context: CoreContext) =>
  async (args: ReserveArgs): Promise<ReserveResult> => {
    const { mainRepository } = context
    const { organizationSlug, officeSlug, deskId, userEmail } = args
    const { targetEmail, today, lastDay, desks, isReleased } = await bookingContext(context, args)

    const dates = [...new Set(args.dates)].sort()
    if (!dates.length || dates.length > MAX_DAYS_PER_REQUEST || !dates.every(isDay))
      throw new ReservationError("Pick between 1 and 31 days.")
    if (dates[0] < today) throw new ReservationError("Days in the past can't be booked.")
    if (dates[dates.length - 1] > lastDay)
      throw new ReservationError("Desks can be booked up to {day}.", { day: { day: lastDay } })

    const desk = desks.find((d) => d.id === deskId)
    if (!desk) throw new ReservationError("This desk no longer exists.")
    // A permanent desk: bookable only on the days its resident gave it up.
    let free = dates
    if (desk.assignee) {
      if (desk.assignee === targetEmail)
        throw new ReservationError("This is already your permanent desk.")
      free = dates.filter((d) => isReleased(deskId, d))
      if (!free.length) {
        const resident = await mainRepository.profile.find({
          userEmail: desk.assignee,
          organizationSlug,
        })
        throw new ReservationError(
          resident?.displayName
            ? msg("This is {name}'s permanent desk, so it can't be booked.")
            : msg("This is someone's permanent desk, so it can't be booked."),
          { name: resident?.displayName ?? "" }
        )
      }
    }
    if (desks.some((d) => d.assignee === targetEmail))
      throw new ReservationError("You already have a permanent desk in this office.")
    const resident = desk.assignee
    const kept = dates
      .filter((d) => !free.includes(d))
      .map((date) => ({ date, userEmail: resident as string }))

    try {
      const result = await mainRepository.reservation.book({
        organizationSlug,
        officeSlug,
        deskId,
        userEmail: targetEmail,
        createdByEmail: userEmail,
        dates: free,
        seriesId: free.length > 1 ? randomUUID() : null,
      })
      if (result.booked.length)
        await mainRepository.waitlist.remove({
          organizationSlug,
          userEmail: targetEmail,
          dates: result.booked,
        })
      // Days the resident kept come back as taken by them.
      return { ...result, conflicts: [...result.conflicts, ...kept] }
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") throw new ReservationRaceError()
      throw error
    }
  }
