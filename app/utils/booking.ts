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

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const isoWeekday = (day: Day) => weekday(day) || 7

/** Every weekday open (an office's default). */
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

/**
 * When an office is open for booking: the weekdays it's open (ISO), and the
 * days it's closed anyway (a holiday: day → its reason, or "").
 */
export interface OfficeOpening {
  openWeekdays: number[]
  closedDays: Record<Day, string>
}

/** Whether people can book a day in an office. */
export const isOpenDay = (day: Day, { openWeekdays, closedDays }: OfficeOpening) =>
  openWeekdays.includes(isoWeekday(day)) && !(day in closedDays)

/** Monday of the day's week. */
export const weekStart = (day: Day) => addDays(day, -((weekday(day) + 6) % 7))

/** ISO 8601 week number: weeks start on Monday, week 1 holds the year's first Thursday. */
export const weekNumber = (day: Day) => {
  const thursday = addDays(weekStart(day), 3)
  const yearStart = toUtcDate(`${thursday.slice(0, 4)}-01-01`)
  return Math.floor((toUtcDate(thursday).getTime() - yearStart.getTime()) / (7 * 86_400_000)) + 1
}

export const minDay = (a: Day, b: Day) => (a < b ? a : b)
export const maxDay = (a: Day, b: Day) => (a > b ? a : b)

/** Every day from `from` to `to`, inclusive. */
export const daysBetween = (from: Day, to: Day): Day[] => {
  const out: Day[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

// Dates as text (in the reader's language): see ~/i18n/translate (`format`).

/** Bookings by day, then by desk id → the booker's email. */
export type BookingsByDay = Record<Day, Record<string, string>>

/** Days to book on one desk — a booking request is one or more of these. */
export interface DeskDays {
  deskId: string
  dates: Day[]
}

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
 * Only bookable days are included (today or later, within the window, the
 * office open).
 */
export const bookingPresets = (
  day: Day,
  today: Day,
  lastDay: Day,
  opening: OfficeOpening = { openWeekdays: ALL_WEEKDAYS, closedDays: {} }
) => {
  const bookable = (d: Day) => d >= today && d <= lastDay && isOpenDay(d, opening)
  const week: Day[] = []
  if (!isWeekend(day))
    for (let d = day; !isWeekend(d); d = addDays(d, 1)) if (bookable(d)) week.push(d)
  const every: Day[] = []
  for (let d = day; d <= lastDay; d = addDays(d, 7)) if (bookable(d)) every.push(d)
  return { one: bookable(day) ? [day] : [], week, every }
}

export type BookingPreset = keyof ReturnType<typeof bookingPresets>
