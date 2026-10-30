import type { CoreContext } from "../types"
import { layoutSchema } from "~/components/OfficeEditor/office/schema"
import { isSeatable } from "~/components/OfficeEditor/office/catalog"
import { Role } from "~/repositories/main-repository/prisma/generated/prisma-client/enums"
import {
  addDays,
  daysBetween,
  isWeekend,
  todayIn,
  weekStart,
  weekday,
  type Day,
} from "~/utils/booking"

/**
 * How an office is used, for its admins: the last 4 or 12 weeks, or what's
 * booked for the next two. Working days (Monday–Friday) only. A desk is "in
 * use" on a day when it's booked, or it's someone's permanent desk and they
 * didn't give it up. Permanent desks count as used on their days — there's no
 * check-in to tell otherwise.
 */
export type InsightsPeriod = "4w" | "12w" | "next"

export interface InsightsDay {
  date: Day
  booked: number
  permanent: number
  /** Share of desks in use (0–1). */
  ratio: number
  isFull: boolean
  /** People waiting for a desk (upcoming days only — fulfilled waits aren't kept). */
  waiting: number
}

export interface OfficeInsights {
  period: InsightsPeriod
  from: Day
  to: Day
  deskCount: number
  memberCount: number
  /** Average share of desks in use per working day (0–1). */
  occupancy: number
  /** The same for the period before (past periods only). */
  previousOccupancy: number | null
  /** ISO weekday (1 = Monday … 5) → average share in use. */
  byWeekday: { weekday: number; ratio: number }[]
  /** Average desks in use per working day, week by week. */
  byWeek: { start: Day; booked: number; permanent: number }[]
  days: InsightsDay[]
  /** People who came in (booked or sat at their permanent desk) — and how often. */
  people: { came: number; daysPerWeek: number }
  fullDays: number
  /** Every desk: the share of working days it was in use, and when last. */
  desks: {
    deskId: string
    label?: string
    ratio: number
    lastUsed: Day | null
    resident?: string
  }[]
  /** Permanent desks: how often their resident gave them up. */
  permanent: { deskId: string; label?: string; resident: string; givenUp: number }[]
}

const rangeFor = (period: InsightsPeriod, today: Day, lastDay: Day) => {
  if (period === "next")
    return { from: today, to: addDays(today, 13) < lastDay ? addDays(today, 13) : lastDay }
  const weeks = period === "4w" ? 4 : 12
  return { from: addDays(today, -weeks * 7), to: addDays(today, -1) }
}

export const getOfficeInsights =
  ({ mainRepository }: CoreContext) =>
  async (args: {
    organizationSlug: string
    officeSlug: string
    userEmail: string
    period: InsightsPeriod
  }): Promise<OfficeInsights> => {
    const { organizationSlug, officeSlug, period } = args
    const profile = await mainRepository.profile.find({
      userEmail: args.userEmail,
      organizationSlug,
    })
    if (!profile || profile.role !== Role.ADMIN) throw new Error("Forbidden")
    const office = await mainRepository.office.find({
      filter: { organizationSlug, slug: officeSlug },
    })
    if (!office) throw new Error("Not Found")

    const parsed = layoutSchema.safeParse(office.layout ?? [])
    const desks = (parsed.success ? parsed.data : []).filter((o) => isSeatable(o.type))
    const deskIds = new Set(desks.map((d) => d.id))
    const today = todayIn(office.timezone)
    const { from, to } = rangeFor(period, today, addDays(today, office.bookingWindowDays))
    // The period before (as long), for the comparison.
    const length = daysBetween(from, to).length
    const before = { from: addDays(from, -length), to: addDays(from, -1) }
    const loadFrom = period === "next" ? from : before.from

    const [reservations, releases, waitlist, members] = await Promise.all([
      mainRepository.reservation.findMany({
        filter: { organizationSlug, officeSlug, from: loadFrom, to },
      }),
      mainRepository.deskRelease.findMany({ organizationSlug, officeSlug, from: loadFrom, to }),
      period === "next"
        ? mainRepository.waitlist.findMany({ organizationSlug, officeSlug, from, to })
        : Promise.resolve([]),
      mainRepository.profile.findMany({ filter: { organizationSlug } }),
    ])

    // Who sat where, day by day.
    const bookedOn = new Map<Day, Map<string, string>>() // day → desk → person
    for (const r of reservations) {
      if (!deskIds.has(r.deskId)) continue
      const day = bookedOn.get(r.date) ?? new Map()
      day.set(r.deskId, r.userEmail)
      bookedOn.set(r.date, day)
    }
    const released = new Set(releases.map((r) => `${r.deskId}|${r.date}`))
    const residents = desks.filter((d) => d.assignee)
    const waitingOn = new Map<Day, number>()
    for (const w of waitlist) waitingOn.set(w.date, (waitingOn.get(w.date) ?? 0) + 1)

    const summarise = (dates: Day[]) =>
      dates.map((date): InsightsDay => {
        const booked = bookedOn.get(date)?.size ?? 0
        // A permanent desk given up and booked counts once, as booked.
        const permanent = residents.filter((d) => !released.has(`${d.id}|${date}`)).length
        const inUse = Math.min(desks.length, booked + permanent)
        return {
          date,
          booked,
          permanent,
          ratio: desks.length ? inUse / desks.length : 0,
          isFull: desks.length > 0 && inUse >= desks.length,
          waiting: waitingOn.get(date) ?? 0,
        }
      })
    const workdays = (a: Day, b: Day) => daysBetween(a, b).filter((d) => !isWeekend(d))
    const dates = workdays(from, to)
    const days = summarise(dates)
    const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

    const previousDays = period === "next" ? [] : summarise(workdays(before.from, before.to))

    // Week by week.
    const weeks = new Map<Day, InsightsDay[]>()
    for (const d of days) {
      const start = weekStart(d.date)
      weeks.set(start, [...(weeks.get(start) ?? []), d])
    }

    // People: who was in, and on how many days.
    const personDays = new Map<string, number>()
    for (const date of dates) {
      for (const email of bookedOn.get(date)?.values() ?? [])
        personDays.set(email, (personDays.get(email) ?? 0) + 1)
      for (const d of residents)
        if (!released.has(`${d.id}|${date}`))
          personDays.set(d.assignee as string, (personDays.get(d.assignee as string) ?? 0) + 1)
    }
    const totalPersonDays = [...personDays.values()].reduce((s, n) => s + n, 0)
    const weekCount = Math.max(1, dates.length / 5)

    return {
      period,
      from,
      to,
      deskCount: desks.length,
      memberCount: members.totalCount,
      occupancy: mean(days.map((d) => d.ratio)),
      previousOccupancy: previousDays.length ? mean(previousDays.map((d) => d.ratio)) : null,
      byWeekday: [1, 2, 3, 4, 5].map((w) => ({
        weekday: w,
        ratio: mean(days.filter((d) => ((weekday(d.date) + 6) % 7) + 1 === w).map((d) => d.ratio)),
      })),
      byWeek: [...weeks].map(([start, list]) => ({
        start,
        booked: mean(list.map((d) => d.booked)),
        permanent: mean(list.map((d) => d.permanent)),
      })),
      days,
      people: {
        came: personDays.size,
        daysPerWeek: personDays.size ? totalPersonDays / personDays.size / weekCount : 0,
      },
      fullDays: days.filter((d) => d.isFull).length,
      desks: desks
        .map((desk) => {
          const used = dates.filter(
            (date) =>
              bookedOn.get(date)?.has(desk.id) ||
              (desk.assignee && !released.has(`${desk.id}|${date}`))
          )
          return {
            deskId: desk.id,
            label: desk.label,
            ratio: dates.length ? used.length / dates.length : 0,
            lastUsed: used.length ? used[used.length - 1] : null,
            resident: desk.assignee,
          }
        })
        .sort((a, b) => b.ratio - a.ratio),
      permanent: residents.map((d) => ({
        deskId: d.id,
        label: d.label,
        resident: d.assignee as string,
        givenUp: dates.filter((date) => released.has(`${d.id}|${date}`)).length,
      })),
    }
  }
