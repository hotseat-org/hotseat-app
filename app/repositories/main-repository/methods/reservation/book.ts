import prisma from "~/services/prisma.server"
import { fromUtcDate, toUtcDate, type Day } from "~/utils/booking"

export interface BookReservationsArgs {
  organizationSlug: string
  officeSlug: string
  deskId: string
  userEmail: string
  createdByEmail: string
  dates: Day[]
  seriesId: string | null
}

export interface BookReservationsResult {
  booked: Day[]
  /** Days the desk already belongs to someone else. */
  conflicts: { date: Day; userEmail: string }[]
}

/**
 * Book one desk for several days in one transaction. Days someone else already
 * has are skipped and reported. On the booked days the person's bookings at
 * other desks are removed first (one desk per person per day), so a conflict
 * never leaves them without a desk. A concurrent booking of the same desk/day
 * surfaces as Prisma's unique-violation error (P2002) and rolls everything back.
 */
export const bookReservations = async ({
  organizationSlug,
  officeSlug,
  deskId,
  userEmail,
  createdByEmail,
  dates,
  seriesId,
}: BookReservationsArgs): Promise<BookReservationsResult> =>
  prisma.$transaction(async (tx) => {
    const existing = await tx.reservation.findMany({
      where: { organizationSlug, officeSlug, deskId, date: { in: dates.map(toUtcDate) } },
    })
    const conflicts = existing
      .filter((r) => r.userEmail !== userEmail)
      .map((r) => ({ date: fromUtcDate(r.date), userEmail: r.userEmail }))
    const alreadyMine = new Set(
      existing.filter((r) => r.userEmail === userEmail).map((r) => fromUtcDate(r.date))
    )
    const taken = new Set(conflicts.map((c) => c.date))
    const ok = dates.filter((d) => !taken.has(d))
    const toCreate = ok.filter((d) => !alreadyMine.has(d))

    if (toCreate.length) {
      // Move: drop the person's other desk on those days (any office in the org).
      await tx.reservation.deleteMany({
        where: { organizationSlug, userEmail, date: { in: toCreate.map(toUtcDate) } },
      })
      await tx.reservation.createMany({
        data: toCreate.map((d) => ({
          organizationSlug,
          officeSlug,
          deskId,
          userEmail,
          createdByEmail,
          seriesId,
          date: toUtcDate(d),
        })),
      })
    }
    return { booked: ok, conflicts }
  })
