import { officeLink } from "../notification"
import type { CoreContext } from "../types"
import { bookingContext } from "./context"
import { reserveDesk } from "./reserve"
import { MAX_DAYS_PER_REQUEST, ReservationError } from "./types"
import type { LayoutObject } from "~/components/OfficeEditor/office/schema"
import { addDays, daysBetween, isDay, weekday, type Day } from "~/utils/booking"
import { encodeNotification } from "~/i18n/notifications"

/**
 * Favourite desks, a usual desk booked on chosen weekdays, and a waitlist for
 * full days — and the engine that books on people's behalf for the last two:
 * when a day opens up for booking (the daily job), when a desk frees up
 * (a cancellation, a resident away), or right away when a usual desk is set.
 */

type Desk = LayoutObject
type Office = { organizationSlug: string; officeSlug: string }

/** ISO weekday: 1 = Monday … 7 = Sunday. */
const isoWeekday = (day: Day) => ((weekday(day) + 6) % 7) + 1

/** Desks free on a day: not someone's permanent desk (unless given up), not booked. */
const freeDesks = (
  desks: Desk[],
  day: Day,
  booked: Set<string>,
  isReleased: (deskId: string, day: string) => boolean
) => desks.filter((d) => (!d.assignee || isReleased(d.id, day)) && !booked.has(d.id))

/**
 * The desk to book for someone: their favourites first (in the order they
 * starred them); else the most like `like` — the same features, then the
 * nearest; else the first free one.
 */
const pickDesk = (free: Desk[], favorites: string[], like?: Desk): Desk | undefined => {
  for (const id of favorites) {
    const desk = free.find((d) => d.id === id)
    if (desk) return desk
  }
  if (!like) return free[0]
  const same = (d: Desk) =>
    (d.features ?? []).filter((f) => like.features?.includes(f)).length ===
    (like.features ?? []).length
  return [...free].sort(
    (a, b) =>
      Number(same(b)) - Number(same(a)) ||
      Math.hypot(a.x - like.x, a.z - like.z) - Math.hypot(b.x - like.x, b.z - like.z)
  )[0]
}

/**
 * Your desk preferences in an office (for the page): favourites, your usual
 * desk, the days you're waiting for — and how many wait on each day.
 */
export const getDeskPreferences =
  (context: CoreContext) => async (args: Office & { userEmail: string; from: Day }) => {
    const { mainRepository } = context
    const { organizationSlug, officeSlug, userEmail } = args
    const [favorites, usual, line] = await Promise.all([
      mainRepository.favoriteDesk.findMany({ organizationSlug, officeSlug, userEmail }),
      mainRepository.usualDesk.findMany({ organizationSlug, officeSlug, userEmail }),
      mainRepository.waitlist.findMany({ organizationSlug, officeSlug, from: args.from }),
    ])
    const waitingByDay: Record<Day, number> = {}
    for (const e of line) waitingByDay[e.date] = (waitingByDay[e.date] ?? 0) + 1
    return {
      favorites: favorites.map((f) => f.deskId),
      usual: usual[0] ? { deskId: usual[0].deskId, weekdays: usual[0].weekdays } : null,
      waiting: line.filter((e) => e.userEmail === userEmail).map((e) => e.date),
      waitingByDay,
    }
  }

// --- Favourites --------------------------------------------------------------

/** Star or unstar a desk. */
export const setFavoriteDesk =
  (context: CoreContext) =>
  async (args: Office & { userEmail: string; deskId: string; isFavorite: boolean }) => {
    const { desks } = await bookingContext(context, args)
    if (!desks.some((d) => d.id === args.deskId))
      throw new ReservationError("This desk no longer exists.")
    const favorite = {
      organizationSlug: args.organizationSlug,
      officeSlug: args.officeSlug,
      userEmail: args.userEmail,
      deskId: args.deskId,
    }
    if (args.isFavorite) await context.mainRepository.favoriteDesk.add(favorite)
    else await context.mainRepository.favoriteDesk.remove(favorite)
  }

// --- Usual desk ----------------------------------------------------------------

export interface UsualDeskResult {
  booked: Day[]
  /** Days your usual desk was taken: booked elsewhere. */
  moved: { date: Day; deskId: string }[]
  /** Days nothing was free: you're on the waitlist. */
  waiting: Day[]
}

/** Make a desk your usual one on these weekdays — and book the days open now. */
export const setUsualDesk =
  (context: CoreContext) =>
  async (
    args: Office & { userEmail: string; deskId: string; weekdays: number[] }
  ): Promise<UsualDeskResult> => {
    const { desks } = await bookingContext(context, args)
    const desk = desks.find((d) => d.id === args.deskId)
    if (!desk) throw new ReservationError("This desk no longer exists.")
    if (desks.some((d) => d.assignee === args.userEmail))
      throw new ReservationError("You already have a permanent desk in this office.")
    if (desk.assignee) throw new ReservationError("This is someone's permanent desk.")
    const weekdays = [...new Set(args.weekdays)].sort()
    if (!weekdays.length || !weekdays.every((w) => Number.isInteger(w) && w >= 1 && w <= 7))
      throw new ReservationError("Pick at least one day of the week.")
    const key = {
      organizationSlug: args.organizationSlug,
      officeSlug: args.officeSlug,
      userEmail: args.userEmail,
    }
    await context.mainRepository.usualDesk.set({ ...key, deskId: args.deskId, weekdays })
    const [result] = await bookUsualDesks(context)(key)
    return result ?? { booked: [], moved: [], waiting: [] }
  }

/** Stop booking a usual desk (days already booked stay booked). */
export const removeUsualDesk =
  (context: CoreContext) => async (args: Office & { userEmail: string }) => {
    await bookingContext(context, args)
    await context.mainRepository.usualDesk.remove(args)
  }

/**
 * Book usual desks on the days that have opened up since the last run: the
 * usual desk if it's free; else a favourite, or the desk most like it; else the
 * waitlist. Days you already have a desk (or are waiting) are left alone, and
 * a day once handled isn't booked again — so cancelling one sticks.
 */
export const bookUsualDesks =
  (context: CoreContext) =>
  async (scope: Partial<Office & { userEmail: string }> = {}): Promise<UsualDeskResult[]> => {
    const { mainRepository } = context
    const results: UsualDeskResult[] = []
    for (const rule of await mainRepository.usualDesk.findMany(scope)) {
      const result: UsualDeskResult = { booked: [], moved: [], waiting: [] }
      results.push(result)
      let booking
      try {
        booking = await bookingContext(context, rule)
      } catch {
        continue // left the organization, or the office is gone
      }
      const { today, lastDay, desks, isReleased } = booking
      const { organizationSlug, officeSlug, userEmail } = rule
      const start =
        rule.bookedThrough && rule.bookedThrough >= today ? addDays(rule.bookedThrough, 1) : today
      const days =
        start <= lastDay
          ? daysBetween(start, lastDay).filter((d) => rule.weekdays.includes(isoWeekday(d)))
          : []
      if (days.length) {
        const [mine, waiting, taken, favorites] = await Promise.all([
          mainRepository.reservation.findMany({
            filter: { organizationSlug, userEmail, dates: days },
          }),
          mainRepository.waitlist.findMany({
            organizationSlug,
            userEmail,
            from: days[0],
            to: lastDay,
          }),
          mainRepository.reservation.findMany({
            filter: { organizationSlug, officeSlug, dates: days },
          }),
          mainRepository.favoriteDesk.findMany({ organizationSlug, officeSlug, userEmail }),
        ])
        const usual = desks.find((d) => d.id === rule.deskId)
        const todo = days.filter(
          (d) => !mine.some((r) => r.date === d) && !waiting.some((w) => w.date === d)
        )
        for (const day of todo) {
          const booked = new Set(taken.filter((r) => r.date === day).map((r) => r.deskId))
          const free = freeDesks(desks, day, booked, isReleased)
          const pick =
            usual && free.some((d) => d.id === usual.id)
              ? usual
              : pickDesk(
                  free,
                  favorites.map((f) => f.deskId),
                  usual
                )
          if (!pick) {
            result.waiting.push(day)
            continue
          }
          try {
            const r = await reserveDesk(context)({
              organizationSlug,
              officeSlug,
              userEmail,
              deskId: pick.id,
              dates: [day],
            })
            if (!r.booked.length) continue
            result.booked.push(day)
            if (pick.id !== rule.deskId) result.moved.push({ date: day, deskId: pick.id })
          } catch (error) {
            // Taken a moment ago, or no longer allowed: leave the day.
            console.warn("usual desk: couldn't book", userEmail, day, error)
          }
        }
        if (result.waiting.length)
          await mainRepository.waitlist.add({
            organizationSlug,
            officeSlug,
            userEmail,
            dates: result.waiting,
          })
        const link = officeLink(organizationSlug, officeSlug)
        await mainRepository.notification.create({
          data: [
            ...result.moved.map(({ date, deskId }) => {
              const desk = desks.find((d) => d.id === deskId) as Desk
              return {
                userEmail,
                organizationSlug,
                message: encodeNotification(
                  "Your usual desk was taken on {day}, so we booked {desk} for you instead.",
                  { day: { day: date }, desk: { desk: desk.label ?? null } }
                ),
                link: `${link}?day=${date}`,
              }
            }),
            ...(result.waiting.length
              ? [
                  {
                    userEmail,
                    organizationSlug,
                    message: encodeNotification(
                      "The office is full on {days}. You're on the waitlist and will get the first desk that frees up.",
                      { days: { days: result.waiting } }
                    ),
                    link: `${link}?day=${result.waiting[0]}`,
                  },
                ]
              : []),
          ],
        })
      }
      await mainRepository.usualDesk.markBooked(rule, lastDay)
    }
    return results
  }

// --- Waitlist -----------------------------------------------------------------

/** Wait for a desk on full days (days with a free desk are for booking instead). */
export const joinWaitlist =
  (context: CoreContext) => async (args: Office & { userEmail: string; dates: Day[] }) => {
    const { mainRepository } = context
    const { today, lastDay, desks, isReleased } = await bookingContext(context, args)
    const dates = [...new Set(args.dates)].sort()
    if (!dates.length || dates.length > MAX_DAYS_PER_REQUEST || !dates.every(isDay))
      throw new ReservationError("Pick between 1 and 31 days.")
    if (dates[0] < today || dates[dates.length - 1] > lastDay)
      throw new ReservationError("You can wait for days up to {day}.", { day: { day: lastDay } })
    const { organizationSlug, officeSlug, userEmail } = args
    if (desks.some((d) => d.assignee === userEmail))
      throw new ReservationError("You have a permanent desk here — no need to wait.")
    const [mine, taken] = await Promise.all([
      mainRepository.reservation.findMany({ filter: { organizationSlug, userEmail, dates } }),
      mainRepository.reservation.findMany({ filter: { organizationSlug, officeSlug, dates } }),
    ])
    if (mine.length)
      throw new ReservationError("You already have a desk on {day}.", {
        day: { day: mine[0].date },
      })
    const open = dates.find(
      (d) =>
        freeDesks(
          desks,
          d,
          new Set(taken.filter((r) => r.date === d).map((r) => r.deskId)),
          isReleased
        ).length > 0
    )
    if (open)
      throw new ReservationError("There are free desks on {day} — book one.", {
        day: { day: open },
      })
    await mainRepository.waitlist.add({ organizationSlug, officeSlug, userEmail, dates })
  }

export const leaveWaitlist =
  (context: CoreContext) => async (args: Office & { userEmail: string; dates: Day[] }) => {
    await bookingContext(context, args)
    await context.mainRepository.waitlist.remove(args)
  }

/**
 * Desks freed up: book them for whoever's first in line on those days (their
 * favourite if free, else any), and tell them. Those who've found a desk
 * meanwhile just leave the line. No `dates`: every day still waited on.
 */
export const fillWaitlist =
  (context: CoreContext) =>
  async ({ organizationSlug, officeSlug, dates }: Office & { dates?: Day[] }) => {
    const { mainRepository } = context
    const line = (await mainRepository.waitlist.findMany({ organizationSlug, officeSlug })).filter(
      (e) => !dates || dates.includes(e.date)
    )
    if (!line.length) return { booked: 0 }
    let booked = 0
    for (const day of [...new Set(line.map((e) => e.date))]) {
      const waiting = line.filter((e) => e.date === day)
      let booking
      try {
        booking = await bookingContext(context, { ...waiting[0], organizationSlug, officeSlug })
      } catch {
        continue
      }
      const { today, desks, isReleased } = booking
      if (day < today) {
        // A day gone by: nobody's waiting for it any more.
        for (const e of waiting) await mainRepository.waitlist.remove({ ...e, dates: [day] })
        continue
      }
      const taken = await mainRepository.reservation.findMany({
        filter: { organizationSlug, officeSlug, dates: [day] },
      })
      let free = freeDesks(desks, day, new Set(taken.map((r) => r.deskId)), isReleased)
      for (const entry of waiting) {
        if (!free.length) break
        const { userEmail } = entry
        const leave = () => mainRepository.waitlist.remove({ ...entry, dates: [day] })
        const has = await mainRepository.reservation.findMany({
          filter: { organizationSlug, userEmail, dates: [day] },
        })
        // Found a desk meanwhile (or got a permanent one here): out of the line.
        if (has.length || desks.some((d) => d.assignee === userEmail)) {
          await leave()
          continue
        }
        const favorites = await mainRepository.favoriteDesk.findMany({
          organizationSlug,
          officeSlug,
          userEmail,
        })
        const pick = pickDesk(
          free,
          favorites.map((f) => f.deskId)
        ) as Desk
        try {
          const r = await reserveDesk(context)({
            organizationSlug,
            officeSlug,
            userEmail,
            deskId: pick.id,
            dates: [day],
          })
          free = free.filter((d) => d.id !== pick.id)
          if (!r.booked.length) continue
          booked++
          await leave()
          await mainRepository.notification.create({
            data: [
              {
                userEmail,
                organizationSlug,
                message: encodeNotification("A desk freed up on {day} — you're booked at {desk}.", {
                  day: { day },
                  desk: { desk: pick.label ?? null },
                }),
                link: `${officeLink(organizationSlug, officeSlug)}?day=${day}`,
              },
            ],
          })
        } catch (error) {
          console.warn("waitlist: couldn't book", userEmail, day, error)
          free = free.filter((d) => d.id !== pick.id)
        }
      }
    }
    return { booked }
  }

/**
 * The daily job (a cron trigger): book usual desks on the days that opened
 * up, and hand any free desks to people waiting. Safe to run more often.
 */
export const runBookingJobs = (context: CoreContext) => async () => {
  const usual = await bookUsualDesks(context)()
  const offices = new Map<string, Office>()
  for (const e of await context.mainRepository.waitlist.findMany({}))
    offices.set(`${e.organizationSlug}/${e.officeSlug}`, e)
  let waitlisted = 0
  for (const office of offices.values()) waitlisted += (await fillWaitlist(context)(office)).booked
  return {
    usualBooked: usual.reduce((n, r) => n + r.booked.length, 0),
    waitlisted,
  }
}
