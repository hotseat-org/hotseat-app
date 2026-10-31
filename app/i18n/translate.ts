import { DEFAULT_LOCALE, type Locale } from "./locales"
import { toUtcDate, type Day } from "~/utils/booking"

/** A plural message: one text per plural category of the language ("other" always). */
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }
/** A language's messages, keyed by the English text. */
export type Messages = Record<string, string | PluralForms>

/**
 * The languages' messages loaded so far: English is its own keys; others are
 * registered — on the server all at once (messages.server.ts), in the browser
 * when the language is needed (loadMessages), so each reader downloads only
 * their own.
 */
const MESSAGES: Partial<Record<Locale, Messages>> = { en: {} }

export const registerMessages = (locale: Locale, messages: Messages) => {
  MESSAGES[locale] = messages
}

/** Load a language's messages in the browser, before showing it (English needs none). */
export const loadMessages = async (locale: Locale) => {
  if (MESSAGES[locale]) return

  if (locale === "cs") registerMessages("cs", (await import("./cs")).cs)
}

/** A day as a value: written out as a date in the reader's language ("Wed 23 Sep"). */
export type DayParam = { day: Day }
/** Days as a value: "Thu 22 Oct", "Thu 22 Oct and Fri 23 Oct", "3 days from Thu 22 Oct". */
export type DaysParam = { days: Day[] }
/** A desk as a value: "desk D-5", or "a desk" without a label. */
export type DeskParam = { desk: string | null }
export type Params = Record<string, string | number | DayParam | DaysParam | DeskParam>

/**
 * Formatting for one language: dates (days are UTC calendar days — see
 * booking.ts), numbers and percentages.
 */
export const createFormat = (locale: Locale) => {
  const tag = locale === "cs" ? "cs-CZ" : "en-GB"
  const date = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(tag, { ...options, timeZone: "UTC" })
  const dow = date({ weekday: "short" })
  const weekday = date({ weekday: "long" })
  const month = date({ month: "short" })
  const monthYear = date({ month: "long", year: "numeric" })
  const dayMonth = date({ day: "numeric", month: "numeric" })
  const letter = date({ weekday: "narrow" })
  const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 })
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" })
  // A moment (not a calendar day): in the reader's own time zone.
  const calendar = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" })
  const calendarShort = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" })
  const number = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 })
  const dayOfMonth = (day: Day) => Number(day.slice(8, 10))
  const long = (day: Day) =>
    locale === "cs"
      ? `${dow.format(toUtcDate(day))} ${dayMonth.format(toUtcDate(day))}`
      : `${dow.format(toUtcDate(day))} ${dayOfMonth(day)} ${month.format(toUtcDate(day))}`
  return {
    /** "Wed" / "st" */
    dow: (day: Day) => dow.format(toUtcDate(day)),
    /** "Wed 23" / "st 23." */
    short: (day: Day) =>
      locale === "cs"
        ? `${dow.format(toUtcDate(day))} ${dayOfMonth(day)}.`
        : `${dow.format(toUtcDate(day))} ${dayOfMonth(day)}`,
    /** "Wed 23 Sep" / "st 23. 9." */
    long,
    /**
     * A day in a sentence: "on Wed 23 Sep" / "ve středu 23. 9." (Czech takes
     * the weekday's own preposition and case).
     */
    onDay: (day: Day) =>
      locale === "cs"
        ? `${CS_ON_WEEKDAY[toUtcDate(day).getUTCDay()]} ${dayMonth.format(toUtcDate(day))}`
        : `on ${long(day)}`,
    /** "Every Wednesday" / "každou středu" (by the day's weekday). */
    everyWeekday: (day: Day) =>
      locale === "cs"
        ? CS_EVERY_WEEKDAY[toUtcDate(day).getUTCDay()]
        : `Every ${weekday.format(toUtcDate(day))}`,
    /** "23 Sep" / "23. 9." */
    dayMonth: (day: Day) =>
      locale === "cs"
        ? dayMonth.format(toUtcDate(day))
        : `${dayOfMonth(day)} ${month.format(toUtcDate(day))}`,
    /** Monday–Sunday, short: ["Mon", …, "Sun"] / ["po", …, "ne"]. */
    weekShort: () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => dow.format(new Date(Date.UTC(2024, 0, 1 + i)))),
    /** Monday–Sunday as letters, for a calendar's head: ["M", "T", …] / ["P", "Ú", …]. */
    weekLetters: () =>
      [0, 1, 2, 3, 4, 5, 6].map((i) => letter.format(new Date(Date.UTC(2024, 0, 1 + i)))),
    /** Monday–Friday, short: ["Mon", …] / ["po", …]. */
    workdays: () => [0, 1, 2, 3, 4].map((i) => dow.format(new Date(Date.UTC(2024, 0, 1 + i)))),
    /** "Wednesday" / "středa" */
    weekday: (day: Day) => weekday.format(toUtcDate(day)),
    /** "September 2026" / "září 2026" */
    month: (day: Day) => monthYear.format(toUtcDate(day)),
    /** How long ago: "5 min ago" / "před 5 min" (minutes, hours, then days). */
    ago: (when: Date | string) => {
      const minutes = Math.round((Date.now() - new Date(when).getTime()) / 60_000)
      if (minutes < 60) return relative.format(-Math.max(0, minutes), "minute")
      if (minutes < 60 * 24) return relative.format(-Math.round(minutes / 60), "hour")
      return relative.format(-Math.round(minutes / 60 / 24), "day")
    },
    /** A moment's date: "23 Oct 2026" / "23. 10. 2026". */
    date: (when: Date | string) => calendar.format(new Date(when)),
    /** A moment's date, no year: "23 Oct" / "23. 10.". */
    dateShort: (when: Date | string) => calendarShort.format(new Date(when)),
    /** 0.51 → "51%" / "51 %" */
    percent: (ratio: number) => percent.format(ratio),
    /** 2.13 → "2.1" / "2,1" */
    number: (n: number) => number.format(n),
  }
}
export type Format = ReturnType<typeof createFormat>

/** "on Monday" … in Czech, by getUTCDay() (0 = Sunday). */
const CS_ON_WEEKDAY = [
  "v neděli",
  "v pondělí",
  "v úterý",
  "ve středu",
  "ve čtvrtek",
  "v pátek",
  "v sobotu",
]

/** "Every Monday" … in Czech, by getUTCDay() (0 = Sunday). */
const CS_EVERY_WEEKDAY = [
  "Každou neděli",
  "Každé pondělí",
  "Každé úterý",
  "Každou středu",
  "Každý čtvrtek",
  "Každý pátek",
  "Každou sobotu",
]

const isDayParam = (value: unknown): value is DayParam =>
  typeof value === "object" && value !== null && "day" in value
const isDaysParam = (value: unknown): value is DaysParam =>
  typeof value === "object" && value !== null && "days" in value
const isDeskParam = (value: unknown): value is DeskParam =>
  typeof value === "object" && value !== null && "desk" in value

/**
 * A translator for one language. Messages are written in English, which is
 * also their key; a missing translation falls back to the English text.
 * `{name}` in a message is replaced by `params.name`.
 */
export const createTranslator = (locale: Locale = DEFAULT_LOCALE) => {
  const messages = MESSAGES[locale] ?? {}
  const format = createFormat(locale)
  const plural = new Intl.PluralRules(locale)
  const fill = (text: string, params?: Params): string =>
    params
      ? text
          .replace(/\{(\w+)\}/g, (match, name: string) => {
            const value = params[name]
            if (value === undefined) return match
            if (isDayParam(value)) return format.long(value.day)
            if (isDaysParam(value)) return daysText(value.days)
            if (isDeskParam(value))
              return value.desk ? t("desk {label}", { label: value.desk }) : t("a desk")
            return typeof value === "number" ? format.number(value) : value
          })
          // A value ending a sentence with its own full stop (a Czech date: "27. 10.").
          .replace(/(?<!\.)\.\.(?!\.)/g, ".")
      : text
  const daysText = (days: Day[]) => {
    const sorted = [...days].sort()
    if (sorted.length === 1) return format.long(sorted[0])
    if (sorted.length === 2)
      return t("{first} and {second}", { first: { day: sorted[0] }, second: { day: sorted[1] } })
    return tn(sorted.length, "{n} day from {first}", "{n} days from {first}", {
      first: { day: sorted[0] },
    })
  }

  /** "Book more days" → "Rezervovat další dny" */
  function t(key: string, params?: Params): string {
    const message = messages[key]
    return fill(typeof message === "string" ? message : key, params)
  }

  /**
   * By count: `tn(n, "{n} desk", "{n} desks")`. The translation (keyed by the
   * singular) has a form per plural category — Czech: one, few, many, other.
   * `{n}` is the count.
   */
  const tn = (count: number, one: string, other: string, params?: Params) => {
    const message = messages[one]
    const all = { n: count, ...params }
    if (message && typeof message !== "string")
      return fill(message[plural.select(count)] ?? message.other, all)
    return fill(count === 1 ? one : other, all)
  }

  return { locale, t, tn, format }
}
export type Translator = ReturnType<typeof createTranslator>

/**
 * A message to show someone later, in THEIR language (a notification, an error
 * from the server): its English key and values, translated when it's read.
 */
export interface Message {
  key: string
  params?: Params
  /** Plural: the English plural form and the count (`key` is the singular). */
  plural?: { other: string; count: number }
}

export const translateMessage = (translator: Translator, message: Message) =>
  message.plural
    ? translator.tn(message.plural.count, message.key, message.plural.other, message.params)
    : translator.t(message.key, message.params)

/**
 * A translator for a route's `meta` (no hooks there): the language the root
 * loader picked, found among the matched routes.
 */
export const metaTranslator = (
  matches: readonly ({ id: string; data?: unknown } | undefined)[]
) => {
  const root = matches.find((m) => m?.id === "root")?.data as { locale?: Locale } | undefined
  return createTranslator(root?.locale)
}
