import type { CoreContext } from "../types"
import { bookingContext } from "./context"
import { fillWaitlist } from "./preferences"
import { MAX_DAYS_PER_REQUEST, ReservationError } from "./types"
import { isDay, type Day } from "~/utils/booking"

export interface CancelArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  dates: Day[]
  /** Cancel another member's bookings (admins only). */
  forEmail?: string
}

/**
 * Cancel your bookings in an office on the given days (not past ones). The
 * desks freed go to whoever's waiting for those days.
 */
export const cancelReservations =
  (context: CoreContext) =>
  async (args: CancelArgs): Promise<{ cancelled: number }> => {
    const { organizationSlug, officeSlug } = args
    const { targetEmail, today } = await bookingContext(context, args)

    const dates = [...new Set(args.dates)]
    if (!dates.length || dates.length > MAX_DAYS_PER_REQUEST || !dates.every(isDay))
      throw new ReservationError("Pick between 1 and 31 days.")
    if (dates.some((d) => d < today))
      throw new ReservationError("Past bookings can't be cancelled.")

    const cancelled = await context.mainRepository.reservation.delete({
      organizationSlug,
      officeSlug,
      userEmail: targetEmail,
      dates,
    })
    if (cancelled) await fillWaitlist(context)({ organizationSlug, officeSlug, dates })
    return { cancelled }
  }
