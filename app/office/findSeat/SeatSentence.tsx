import { Fragment, type ReactNode } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { personByEmail, usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import type { SeatRule } from "./matching"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Where a pill goes in a phrase's words (never typed by anyone). */
const PILL = "\u0000"

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="mx-0.5 inline-flex items-center rounded-full bg-accent/15 px-2.5 py-0.5 text-accent">
    {children}
  </span>
)

/** A phrase's words with its value as a pill: "in {zone}" → in [Marketing]. */
const withPill = (template: string, value: string) => {
  const [before, after = ""] = template.split(PILL)

  return (
    <>
      {before}
      <Pill>{value}</Pill>
      {after}
    </>
  )
}

/**
 * The search said as a sentence — "A seat today in Marketing, ideally near
 * Anna" — the day and each preference a pill: musts as they are, then what
 * you'd prefer, "ideally".
 */
export const SeatSentence = ({
  rules,
  day,
  dayChoices,
}: {
  rules: SeatRule[]
  /** The day, or none: any day. */
  day: Day | null
  dayChoices: Day[]
}) => {
  const { t, format } = useI18n()
  const people = usePeople()
  const today = useOfficeStore((state) => state.booking.today)
  const nameOf = (email: string) => personByEmail(people, email)?.name ?? email.split("@")[0]
  const featureOf = (id: string) => {
    const feature = DESK_FEATURES.find((candidate) => candidate.id === id)

    return feature ? t(feature.label) : id
  }

  const getDayWords = () => {
    if (!day) return t("any day")
    if (day === today) return t("today")
    if (dayChoices[0] === today && day === dayChoices[1]) return t("tomorrow")

    return format.onDay(day)
  }

  const phraseOf = (rule: SeatRule) => {
    if (rule.kind === "zone") return withPill(t("in {zone}", { zone: PILL }), rule.zone)
    if (rule.kind === "favorite") return t("at one of my favourites")
    if (rule.kind === "feature")
      return withPill(t("with {feature}", { feature: PILL }), featureOf(rule.feature))
    if (rule.strength === "avoid")
      return withPill(t("not near {name}", { name: PILL }), nameOf(rule.email))

    return withPill(t("near {name}", { name: PILL }), nameOf(rule.email))
  }

  const musts = rules.filter((rule) => rule.strength !== "prefer")
  const preferred = rules.filter((rule) => rule.strength === "prefer")
  const join = (list: SeatRule[], separator: string) =>
    list.map((rule, index) => (
      <Fragment key={index}>
        {index > 0 && separator}
        {phraseOf(rule)}
      </Fragment>
    ))

  return (
    <>
      {t("A seat")} <Pill>{getDayWords()}</Pill>
      {musts.length > 0 && <> {join(musts, ", ")}</>}
      {preferred.length > 0 && (
        <>
          {musts.length > 0 && ","} {t("ideally")} {join(preferred, t(" and "))}
        </>
      )}
    </>
  )
}
