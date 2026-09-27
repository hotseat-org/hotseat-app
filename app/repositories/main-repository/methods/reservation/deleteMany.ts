import prisma from "~/services/prisma.server"
import { toUtcDate, type Day } from "~/utils/booking"

export interface DeleteReservationsArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  dates: Day[]
}

/** Cancel a person's bookings in an office on the given days. Returns how many. */
export const deleteReservations = async ({
  organizationSlug,
  officeSlug,
  userEmail,
  dates,
}: DeleteReservationsArgs): Promise<number> => {
  const { count } = await prisma.reservation.deleteMany({
    where: { organizationSlug, officeSlug, userEmail, date: { in: dates.map(toUtcDate) } },
  })
  return count
}
