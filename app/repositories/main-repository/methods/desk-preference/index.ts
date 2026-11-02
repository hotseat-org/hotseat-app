import prisma from "~/services/prisma.server"
import { fromUtcDate, toUtcDate, type Day } from "~/utils/booking"

/** Where: an organization, optionally one office, optionally one person. */
export interface DeskPreferenceScope {
  organizationSlug: string
  officeSlug?: string
  userEmail?: string
}

export interface FavoriteDesk {
  organizationSlug: string
  officeSlug: string
  deskId: string
  userEmail: string
}

export interface UsualDesk {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  deskId: string
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  weekdays: number[]
  /** Booked (or tried) up to this day; null: not yet. */
  bookedThrough: Day | null
}

export interface WaitlistEntry {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  /** Office-local day, `YYYY-MM-DD`. */
  date: Day
  createdAt: Date
}

// --- Favourite desks -------------------------------------------------------

export const findFavoriteDesks = async (scope: DeskPreferenceScope): Promise<FavoriteDesk[]> =>
  prisma.favoriteDesk.findMany({
    where: scope,
    orderBy: { createdAt: "asc" },
    select: { organizationSlug: true, officeSlug: true, deskId: true, userEmail: true },
  })

export const addFavoriteDesk = async (favorite: FavoriteDesk) => {
  await prisma.favoriteDesk.createMany({ data: [favorite], skipDuplicates: true })
}

export const removeFavoriteDesk = async (favorite: FavoriteDesk) => {
  await prisma.favoriteDesk.deleteMany({ where: favorite })
}

// --- Usual desks (booked automatically on chosen weekdays) ------------------

/** Everyone's (no organization: every organization — for the daily job). */
export const findUsualDesks = async (
  scope: Partial<DeskPreferenceScope> = {}
): Promise<UsualDesk[]> => {
  const rows = await prisma.usualDesk.findMany({
    where: scope,
    orderBy: { createdAt: "asc" },
    select: {
      organizationSlug: true,
      officeSlug: true,
      userEmail: true,
      deskId: true,
      weekdays: true,
      bookedThrough: true,
    },
  })
  return rows.map((r) => ({
    ...r,
    bookedThrough: r.bookedThrough ? fromUtcDate(r.bookedThrough) : null,
  }))
}

export type UsualDeskKey = Pick<UsualDesk, "organizationSlug" | "officeSlug" | "userEmail">

/** Set (or change) someone's usual desk — booked afresh from today. */
export const setUsualDesk = async ({
  weekdays,
  deskId,
  ...key
}: Omit<UsualDesk, "bookedThrough">) => {
  await prisma.usualDesk.upsert({
    where: { organizationSlug_officeSlug_userEmail: key },
    create: { ...key, deskId, weekdays },
    update: { deskId, weekdays, bookedThrough: null },
  })
}

/** Days up to `through` have been booked. */
export const markUsualDeskBooked = async (
  { organizationSlug, officeSlug, userEmail }: UsualDeskKey,
  through: Day
) => {
  await prisma.usualDesk.updateMany({
    where: { organizationSlug, officeSlug, userEmail },
    data: { bookedThrough: toUtcDate(through) },
  })
}

export const removeUsualDesk = async (key: UsualDeskKey) => {
  await prisma.usualDesk.deleteMany({ where: key })
}

// --- Waitlist ---------------------------------------------------------------

/** No organization: everyone's (the daily job). */
export interface FindWaitlistArgs extends Partial<DeskPreferenceScope> {
  /** Inclusive day range. */
  from?: Day
  to?: Day
}

/** First in line first. */
export const findWaitlist = async ({
  from,
  to,
  ...scope
}: FindWaitlistArgs): Promise<WaitlistEntry[]> => {
  const rows = await prisma.waitlistEntry.findMany({
    where: {
      ...scope,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: toUtcDate(from) } : {}),
              ...(to ? { lte: toUtcDate(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })
  return rows.map((r) => ({ ...r, date: fromUtcDate(r.date) }))
}

export interface ChangeWaitlistArgs {
  organizationSlug: string
  officeSlug: string
  userEmail: string
  dates: Day[]
}

/** Join the line for these days (days already waited on keep their place). */
export const addToWaitlist = async ({ dates, ...entry }: ChangeWaitlistArgs) => {
  await prisma.waitlistEntry.createMany({
    data: dates.map((d) => ({ ...entry, date: toUtcDate(d) })),
    skipDuplicates: true,
  })
}

/** Leave the line for these days — in this office, or (no office) any. */
export const removeFromWaitlist = async ({
  dates,
  officeSlug,
  organizationSlug,
  userEmail,
}: Omit<ChangeWaitlistArgs, "officeSlug"> & { officeSlug?: string }) => {
  await prisma.waitlistEntry.deleteMany({
    where: {
      organizationSlug,
      userEmail,
      ...(officeSlug ? { officeSlug } : {}),
      date: { in: dates.map(toUtcDate) },
    },
  })
}

// --- Seat rules (what someone looks for, finding a seat) --------------------

export type SeatRulesKey = Pick<UsualDesk, "organizationSlug" | "officeSlug" | "userEmail">

/** Someone's rules in an office, as kept (unchecked JSON); none kept: null. */
export const findSeatRules = async (key: SeatRulesKey): Promise<unknown | null> => {
  const row = await prisma.seatRules.findUnique({
    where: { organizationSlug_officeSlug_userEmail: key },
    select: { rules: true },
  })

  return row?.rules ?? null
}

export const setSeatRules = async (key: SeatRulesKey, rules: object[]) => {
  await prisma.seatRules.upsert({
    where: { organizationSlug_officeSlug_userEmail: key },
    create: { ...key, rules },
    update: { rules },
  })
}
