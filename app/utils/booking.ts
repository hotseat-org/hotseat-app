/**
 * Desk booking helpers shared by the server (core) and the office UI — no
 * server or three.js imports.
 *
 * Days are office-local calendar days written as `YYYY-MM-DD` strings. They
 * compare correctly as strings, and all arithmetic runs in UTC so a day never
 * shifts under daylight saving or the viewer's timezone.
 */

/** A calendar day, `YYYY-MM-DD`. */
export type Day = string

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export const isDay = (value: unknown): value is Day =>
  typeof value === "string" && DAY_RE.test(value) && !Number.isNaN(toUtcDate(value).getTime())

/** Midnight UTC of the day — how Postgres `DATE` columns round-trip through Prisma. */
export const toUtcDate = (day: Day) => new Date(`${day}T00:00:00Z`)

export const fromUtcDate = (date: Date): Day => date.toISOString().slice(0, 10)

/** Today in an IANA timezone (e.g. "Europe/Prague"). */
export const todayIn = (timeZone: string, now = new Date()): Day => {
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now)
  } catch {
    return fromUtcDate(now)
  }
}

export const addDays = (day: Day, n: number): Day => {
  const d = toUtcDate(day)
  d.setUTCDate(d.getUTCDate() + n)
  return fromUtcDate(d)
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (day: Day) => toUtcDate(day).getUTCDay()

export const isWeekend = (day: Day) => {
  const w = weekday(day)
  return w === 0 || w === 6
}

/** Monday of the day's week. */
export const weekStart = (day: Day) => addDays(day, -((weekday(day) + 6) % 7))

export const minDay = (a: Day, b: Day) => (a < b ? a : b)
export const maxDay = (a: Day, b: Day) => (a > b ? a : b)

/** Every day from `from` to `to`, inclusive. */
export const daysBetween = (from: Day, to: Day): Day[] => {
  const out: Day[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })
const DOW = fmt({ weekday: "short" })
const WEEKDAY = fmt({ weekday: "long" })
const MON = fmt({ month: "short" })
const MONTH = fmt({ month: "long", year: "numeric" })
const dayOfMonth = (day: Day) => Number(day.slice(8, 10))

/** "Wed" */
export const formatDow = (day: Day) => DOW.format(toUtcDate(day))
/** "Wed 23" */
export const formatShort = (day: Day) => `${formatDow(day)} ${dayOfMonth(day)}`
/** "Wed 23 Sep" */
export const formatLong = (day: Day) => `${formatShort(day)} ${MON.format(toUtcDate(day))}`
/** "Wednesday" */
export const formatWeekday = (day: Day) => WEEKDAY.format(toUtcDate(day))
/** "September 2026" */
export const formatMonth = (day: Day) => MONTH.format(toUtcDate(day))

/** Bookings by day, then by desk id → the booker's email. */
export type BookingsByDay = Record<Day, Record<string, string>>

export interface BookingRow {
  deskId: string
  date: Day
  userEmail: string
}

export const groupBookings = (rows: BookingRow[]): BookingsByDay => {
  const out: BookingsByDay = {}
  for (const r of rows) (out[r.date] ??= {})[r.deskId] = r.userEmail
  return out
}

/**
 * Who has a desk on a day. A permanent resident (the desk's `assignee`) wins —
 * unless they gave the desk up that day (`released`): then it's booked or
 * free like any desk.
 */
export type DeskState =
  | { kind: "resident"; email: string }
  | { kind: "booked"; email: string }
  | { kind: "free" }

export const deskState = (
  desk: { id: string; assignee?: string },
  day: Day,
  bookings: BookingsByDay,
  released: BookingsByDay = {}
): DeskState => {
  if (desk.assignee && released[day]?.[desk.id] !== desk.assignee)
    return { kind: "resident", email: desk.assignee }
  const email = bookings[day]?.[desk.id]
  return email ? { kind: "booked", email } : { kind: "free" }
}

/**
 * The quick choices in a desk's booking card, for a chosen day:
 *  - just that day
 *  - the rest of its working week (to Friday)
 *  - the same weekday every week, as far as the booking window allows
 * Only bookable days are included (today or later, within the window).
 */
export const bookingPresets = (day: Day, today: Day, lastDay: Day) => {
  const bookable = (d: Day) => d >= today && d <= lastDay
  const week: Day[] = []
  if (!isWeekend(day))
    for (let d = day; !isWeekend(d); d = addDays(d, 1)) if (bookable(d)) week.push(d)
  const every: Day[] = []
  for (let d = day; d <= lastDay; d = addDays(d, 7)) if (bookable(d)) every.push(d)
  return { one: bookable(day) ? [day] : [], week, every }
}

export type BookingPreset = keyof ReturnType<typeof bookingPresets>
