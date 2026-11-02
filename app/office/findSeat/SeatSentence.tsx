import clsx from "clsx"
import { CalendarDays, SlidersHorizontal, Star } from "lucide-react"
import { Fragment, useMemo, type CSSProperties, type ReactNode } from "react"
import { DESK_FEATURES } from "../desks/deskFeatures"
import { personByEmail, usePeople } from "../desks/people"
import { SeatAvatar } from "../desks/SeatAvatar"
import { useOfficeStore } from "../store"
import { getZones } from "../zones/zones"
import type { SeatRule } from "./matching"
import { useAllPieces } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"
import type { Day } from "~/utils/booking"

/** Where a pill goes in a phrase's words (never typed by anyone). */
const PILL = "\u0000"

/** A pill's look: the day's accent, a place's colour, a person's, a favourite's or an avoided one's amber. */
type PillTone = "accent" | "neutral" | "warning"

const TONES: Record<PillTone, string> = {
  accent: "bg-accent/15 text-accent",
  neutral: "bg-surface-tertiary text-foreground",
  warning: "bg-warning/30 text-warning-foreground",
}

const Pill = ({
  tone = "accent",
  icon,
  style,
  children,
}: {
  tone?: PillTone
  /** Before the words: an icon, a colour dot, a face. */
  icon?: ReactNode
  /** A colour of its own (a zone's), over the tone's. */
  style?: CSSProperties
  children: ReactNode
}) => (
  <span
    className={clsx(
      "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 align-middle leading-snug",
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
  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface/70">
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
  const pieces = useAllPieces()
  const zones = useMemo(() => getZones(pieces), [pieces])
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

  const personPill = (email: string, tone: PillTone) => {
    const person = personByEmail(people, email)

    return (
      <Pill
        tone={tone}
        icon={<SeatAvatar person={person} email={email} isMine={false} size={20} />}
      >
        {person?.name ?? email.split("@")[0]}
      </Pill>
    )
  }

  const phraseOf = (rule: SeatRule) => {
    if (rule.kind === "zone") {
      const color = zones.find((zone) => zone.name === rule.zone)?.color

      return withPill(
        t("in {zone}", { zone: PILL }),
        <Pill
          tone="neutral"
          icon={
            <span className="ml-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
          }
          style={
            color ? { backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` } : undefined
          }
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

    if (rule.strength === "avoid")
      return withPill(t("not near {name}", { name: PILL }), personPill(rule.email, "warning"))

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
