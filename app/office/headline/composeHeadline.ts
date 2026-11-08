import type { Translator } from "~/i18n/translate"
import { addDays, type Day } from "~/utils/booking"

/** Where you are on the shown day. */
export type MyDay =
  | { kind: "booked"; deskLabel?: string }
  | { kind: "resident"; deskLabel?: string }
  | { kind: "away" }
  | { kind: "waiting" }
  | { kind: "none" }

/** What the headline is made of: plain facts about the shown day. */
export interface HeadlineFacts {
  day: Day
  today: Day
  isOpen: boolean
  myDay: MyDay
  freeCount: number
  /** Who else is in, most relevant first (your teams), by the name to show. */
  peopleIn: string[]
  /** One of your teams comes in together that day: its name. */
  teamDay?: string
}

/** The day ("Monday."), then sentences: yours first, then the office's. */
export interface Headline {
  title: string
  sentences: string[]
}

/** "Today.", "Tomorrow.", or the weekday: "Monday." */
const composeTitle = ({ t, format }: Translator, { day, today }: HeadlineFacts) => {
  if (day === today) return t("Today.")

  if (day === addDays(today, 1)) return t("Tomorrow.")

  return t("{weekday}.", { weekday: format.weekday(day) })
}

/** "Lena", "Lena and Max", "Lena, Max and 4 others". */
export const composeNames = ({ t, tn }: Translator, names: string[]) => {
  const [first, second] = names
  if (names.length === 1) return first

  if (names.length === 2) return t("{first} and {second}", { first, second })

  return tn(
    names.length - 2,
    "{first}, {second} and {n} other",
    "{first}, {second} and {n} others",
    { first, second }
  )
}

/** Your part: where you sit, or what to do about it. */
const composeYou = ({ t }: Translator, { myDay, freeCount }: HeadlineFacts, isPast: boolean) => {
  if (isPast) {
    if (myDay.kind !== "booked" && myDay.kind !== "resident") return t("No desk that day.")

    return myDay.deskLabel
      ? t("Your desk was {desk}.", { desk: myDay.deskLabel })
      : t("You had a desk.")
  }

  switch (myDay.kind) {
    case "booked":
      return myDay.deskLabel
        ? t("You're at {desk}.", { desk: myDay.deskLabel })
        : t("You have a desk.")
    case "resident":
      return myDay.deskLabel
        ? t("You're at your desk, {desk}.", { desk: myDay.deskLabel })
        : t("You're at your desk.")
    case "away":
      return t("You're away.")
    case "waiting":
      return t("You're on the waitlist.")
    case "none":
      return freeCount ? t("You're not in, yet.") : t("The office is full.")
  }
}

/** The office's part: who else is in. */
const composePeople = (translator: Translator, peopleIn: string[], isPast: boolean) => {
  const { t, tn } = translator
  if (!peopleIn.length) return isPast ? t("Nobody else was in.") : t("Nobody else is in.")

  const names = composeNames(translator, peopleIn)

  return isPast
    ? tn(peopleIn.length, "{names} was in.", "{names} were in.", { names })
    : tn(peopleIn.length, "{names} is in.", "{names} are in.", { names })
}

/**
 * The shown day in a headline and a few short sentences, from facts: your
 * desk first, then (when you have none) how many are free, your team's day,
 * then who else is in. Each sentence is one translated template, never words glued together,
 * and none says a person did something (Czech past tense shows gender).
 */
export const composeHeadline = (translator: Translator, facts: HeadlineFacts): Headline => {
  const { t, tn } = translator
  const title = composeTitle(translator, facts)
  if (!facts.isOpen) return { title, sentences: [t("The office is closed.")] }

  const isPast = facts.day < facts.today
  const hasNoDesk = facts.myDay.kind === "none" || facts.myDay.kind === "waiting"
  const free =
    !isPast && hasNoDesk && facts.freeCount > 0
      ? [tn(facts.freeCount, "{n} desk is free.", "{n} desks are free.")]
      : []

  const teamDay = facts.teamDay && !isPast ? [t("It's a {team} day.", { team: facts.teamDay })] : []

  return {
    title,
    sentences: [
      composeYou(translator, facts, isPast),
      ...free,
      ...teamDay,
      composePeople(translator, facts.peopleIn, isPast),
    ],
  }
}
