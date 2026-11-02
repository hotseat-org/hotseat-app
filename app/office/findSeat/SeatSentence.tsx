import clsx from "clsx"
import { CalendarDays, SlidersHorizontal, Star } from "lucide-react"
import { Fragment, type CSSProperties, type ReactNode } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { personByEmail, usePeople } from "../desks/people"
import { useOfficeStore } from "../store"
import { teamById, useTeams } from "../teams"
import { isAwayRule, type SeatRule } from "./matching"
import { Face, TONES, getZoneTint, useZoneColors, type RuleTone } from "./ruleLook"
import { TeamDot, getTeamTint } from "~/components/teams/teamLook"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Where a pill goes in a phrase's words (never typed by anyone). */
const PILL = "\u0000"

const Pill = ({
  tone = "accent",
  icon,
  style,
  children,
}: {
  tone?: RuleTone
  /** Before the words: an icon, a colour dot, a face. */
  icon?: ReactNode
  /** A colour of its own (a zone's), over the tone's. */
  style?: CSSProperties
  children: ReactNode
}) => (
  <span
    className={clsx(
      // One height for every pill, its icon in the same round slot: they line up, line on line.
      "inline-flex h-7 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full align-middle leading-none",
      icon ? "pl-1 pr-2.5" : "px-2.5",
      TONES[tone]
    )}
    style={style}
  >
    {icon}
    <span className="truncate">{children}</span>
  </span>
)

/** A phrase's words with its value as a pill: "in {zone}" → in [● Marketing]. */
const withPill = (template: string, pill: ReactNode) => {
  const [before, after = ""] = template.split(PILL)

  return (
    <>
      {before}
      {pill}
      {after}
    </>
  )
}

/** A round icon at a pill's start, the size of a face. */
const PillIcon = ({ children }: { children: ReactNode }) => (
  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-background/70">
    {children}
  </span>
)

/**
 * The search said as a sentence — "A seat today in Marketing, ideally near
 * Anna" — the day and each preference a pill that looks like what it is: a
 * zone in its colour, a person with their face, a favourite with its star.
 * Musts as they are, then what you'd prefer, "ideally".
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
  const zoneColors = useZoneColors()
  const teams = useTeams()
  const today = useOfficeStore((state) => state.booking.today)
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

  const personPill = (email: string, tone: RuleTone) => {
    const person = personByEmail(people, email)

    return (
      <Pill tone={tone} icon={<Face email={email} className="size-5 text-[9px]" />}>
        {person?.name ?? email.split("@")[0]}
      </Pill>
    )
  }

  const phraseOf = (rule: SeatRule) => {
    if (rule.kind === "zone") {
      const color = zoneColors.get(rule.zone)
      // Away from a zone: red, its colour kept in the dot.
      const isAway = isAwayRule(rule)

      return withPill(
        isAway ? t("not in {zone}", { zone: PILL }) : t("in {zone}", { zone: PILL }),
        <Pill
          tone={isAway ? "away" : "neutral"}
          icon={
            <span className="grid size-5 shrink-0 place-items-center">
              <span className="size-2.5 rounded-full" style={{ background: color }} />
            </span>
          }
          style={isAway ? undefined : getZoneTint(color)}
        >
          {rule.zone}
        </Pill>
      )
    }

    if (rule.kind === "favorite")
      return withPill(
        t("at {desk}", { desk: PILL }),
        <Pill
          tone="warning"
          icon={
            <PillIcon>
              <Star className="size-3 fill-current" />
            </PillIcon>
          }
        >
          {t("my preferred seat")}
        </Pill>
      )

    if (rule.kind === "feature")
      return withPill(
        t("with {feature}", { feature: PILL }),
        <Pill
          tone="accent"
          icon={
            <PillIcon>
              <SlidersHorizontal className="size-3" />
            </PillIcon>
          }
        >
          {featureOf(rule.feature)}
        </Pill>
      )

    if (rule.kind === "team") {
      const team = teamById(teams, rule.teamId)

      return withPill(
        t("with {team}", { team: PILL }),
        <Pill
          tone="neutral"
          icon={
            <span className="grid size-5 shrink-0 place-items-center">
              <TeamDot color={team?.color ?? "slate"} />
            </span>
          }
          style={team ? getTeamTint(team.color) : undefined}
        >
          {team?.name ?? t("your team")}
        </Pill>
      )
    }

    if (isAwayRule(rule))
      return withPill(t("not near {name}", { name: PILL }), personPill(rule.email, "away"))

    return withPill(t("near {name}", { name: PILL }), personPill(rule.email, "neutral"))
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
      {t("A seat")}{" "}
      <Pill
        icon={
          <PillIcon>
            <CalendarDays className="size-3" />
          </PillIcon>
        }
      >
        {getDayWords()}
      </Pill>
      {musts.length > 0 && <> {join(musts, ", ")}</>}
      {preferred.length > 0 && (
        <>
          {musts.length > 0 && ","} {t("ideally")} {join(preferred, t(" and "))}
        </>
      )}
    </>
  )
}
