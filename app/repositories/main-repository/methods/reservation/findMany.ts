import type { Reservation } from "../../types"
import prisma from "~/services/prisma.server"
import { fromUtcDate, toUtcDate, type Day } from "~/utils/booking"

export interface FindReservationsArgs {
  filter: {
    organizationSlug: string
    officeSlug?: string
    userEmail?: string
    deskId?: string
    /** Inclusive day range. */
    from?: Day
    to?: Day
    dates?: Day[]
  }
}

export const findReservations = async ({
  filter,
}: FindReservationsArgs): Promise<Reservation[]> => {
  const { from, to, dates, ...rest } = filter
  const rows = await prisma.reservation.findMany({
    where: {
      ...rest,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: toUtcDate(from) } : {}),
              ...(to ? { lte: toUtcDate(to) } : {}),
            },
          }
        : {}),
      ...(dates ? { date: { in: dates.map(toUtcDate) } } : {}),
    },
    orderBy: [{ date: "asc" }, { deskId: "asc" }],
  })
  return rows.map((r) => ({ ...r, date: fromUtcDate(r.date) }))
}
