import prisma from "~/services/prisma.server"
import { fromUtcDate, toUtcDate, type Day } from "~/utils/booking"

/** A day an office is closed, and why. */
export interface ClosedDay {
  date: Day
  reason: string | null
}

interface OfficeScope {
  organizationSlug: string
  officeSlug: string
}

export interface FindClosedDaysArgs extends OfficeScope {
  /** Inclusive range; unset: from the start / to the end. */
  from?: Day
  to?: Day
}

/** An office's closed days, oldest first. */
export const findClosedDays = async ({ from, to, ...office }: FindClosedDaysArgs) => {
  const rows = await prisma.officeClosedDay.findMany({
    where: {
      ...office,
      date: { ...(from && { gte: toUtcDate(from) }), ...(to && { lte: toUtcDate(to) }) },
    },
    orderBy: { date: "asc" },
  })

  return rows.map((row) => ({ date: fromUtcDate(row.date), reason: row.reason }))
}

export interface CreateClosedDaysArgs extends OfficeScope {
  dates: Day[]
  reason: string | null
}

/** Close an office on these days (days closed already keep their reason). */
export const createClosedDays = async ({ dates, reason, ...office }: CreateClosedDaysArgs) => {
  await prisma.officeClosedDay.createMany({
    data: dates.map((date) => ({ ...office, date: toUtcDate(date), reason })),
    skipDuplicates: true,
  })
}

export interface DeleteClosedDaysArgs extends OfficeScope {
  dates: Day[]
}

/** Open an office again on these days. */
export const deleteClosedDays = async ({ dates, ...office }: DeleteClosedDaysArgs) => {
  await prisma.officeClosedDay.deleteMany({
    where: { ...office, date: { in: dates.map(toUtcDate) } },
  })
}
