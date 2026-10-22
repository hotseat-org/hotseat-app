import type { DeskRelease } from "../../types"
import prisma from "~/services/prisma.server"
import { fromUtcDate, toUtcDate, type Day } from "~/utils/booking"

export interface FindDeskReleasesArgs {
  organizationSlug: string
  officeSlug: string
  /** Inclusive day range. */
  from: Day
  to?: Day
  deskId?: string
}

export const findDeskReleases = async ({
  from,
  to,
  ...filter
}: FindDeskReleasesArgs): Promise<DeskRelease[]> => {
  const rows = await prisma.deskRelease.findMany({
    where: { ...filter, date: { gte: toUtcDate(from), ...(to ? { lte: toUtcDate(to) } : {}) } },
    orderBy: { date: "asc" },
  })
  return rows.map((r) => ({ ...r, date: fromUtcDate(r.date) }))
}

export interface ChangeDeskReleasesArgs {
  organizationSlug: string
  officeSlug: string
  deskId: string
  userEmail: string
  dates: Day[]
}

/** Give the desk up on these days (days already given up are kept). */
export const createDeskReleases = async ({ dates, ...release }: ChangeDeskReleasesArgs) => {
  await prisma.deskRelease.createMany({
    data: dates.map((d) => ({ ...release, date: toUtcDate(d) })),
    skipDuplicates: true,
  })
}

/** Take the desk back on these days. */
export const deleteDeskReleases = async ({ dates, ...release }: ChangeDeskReleasesArgs) => {
  await prisma.deskRelease.deleteMany({
    where: { ...release, date: { in: dates.map(toUtcDate) } },
  })
}

/** Drop releases on desks whose resident is no longer the one who released them. */
export const deleteStaleDeskReleases = async ({
  organizationSlug,
  officeSlug,
  residents,
}: {
  organizationSlug: string
  officeSlug: string
  /** deskId → its current resident. */
  residents: Record<string, string>
}) => {
  const rows = await prisma.deskRelease.findMany({ where: { organizationSlug, officeSlug } })
  const stale = rows.filter((r) => residents[r.deskId] !== r.userEmail)
  if (stale.length)
    await prisma.deskRelease.deleteMany({
      where: {
        OR: stale.map((r) => ({ organizationSlug, officeSlug, deskId: r.deskId, date: r.date })),
      },
    })
}
