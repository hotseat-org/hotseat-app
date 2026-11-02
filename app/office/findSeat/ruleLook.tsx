import clsx from "clsx"
import { CircleOff, Layers, SlidersHorizontal, Star, UserRound, UserX } from "lucide-react"
import { useMemo, type CSSProperties } from "react"
import { personByEmail, usePeople } from "../desks/people"
import { getZones } from "../zones/zones"
import { isAwayRule, type SeatRule } from "./matching"
import { PersonFace } from "~/components/people/PeopleSearch"
import { useAllPieces } from "~/editor"

/**
 * How a preference looks, wherever it's shown — the sentence's pills, the
 * preferences' rows, the kinds to add: a zone in its colour, a person with
 * their face, a preferred seat with its amber star, a feature in the accent,
 * someone to sit away from in red.
 */

/** A look's colours: the accent, a quiet one (a zone tints it its own), amber, or red (away). */
export type RuleTone = "accent" | "neutral" | "warning" | "away"

export const TONES: Record<RuleTone, string> = {
  accent: "bg-accent/15 text-accent",
  neutral: "bg-foreground/[0.09] text-foreground",
  warning: "bg-warning/30 text-warning-foreground",
  away: "bg-danger/15 text-danger",
}

export const getRuleTone = (rule: SeatRule): RuleTone => {
  if (isAwayRule(rule)) return "away"
  if (rule.kind === "favorite") return "warning"
  if (rule.kind === "feature") return "accent"

  return "neutral"
}

/** A kind's own tone, before anything's chosen. */
const getKindTone = (kind: SeatRule["kind"]): RuleTone => {
  if (kind === "favorite") return "warning"
  if (kind === "feature") return "accent"

  return "neutral"
}

/** A zone's colour as a tint behind it (none: the tone's). */
export const getZoneTint = (color: string | undefined): CSSProperties | undefined =>
  color ? { backgroundColor: `color-mix(in srgb, ${color} 22%, transparent)` } : undefined

/** Each zone's colour, by its name. */
export const useZoneColors = () => {
  const pieces = useAllPieces()

  return useMemo(() => new Map(getZones(pieces).map((zone) => [zone.name, zone.color])), [pieces])
}

/** A person's face (or initials on their colour), round: no ring, no shadow. */
export const Face = ({ email, className }: { email: string; className: string }) => {
  const person = personByEmail(usePeople(), email)

  return (
    <PersonFace
      person={{ email, name: person?.name ?? email, avatarUrl: person?.avatarUrl }}
      className={className}
    />
  )
}

const TILE = "grid size-10 shrink-0 place-items-center rounded-xl"

/** A kind's icon, before it's chosen what of it (no zone, no person yet). */
const KIND_ICONS = {
  zone: Layers,
  colleague: UserRound,
  feature: SlidersHorizontal,
  favorite: Star,
} as const

/** A kind of preference, as the list to add one shows it: its icon in its tone. */
export const KindTile = ({
  kind,
  isAway = false,
}: {
  kind: SeatRule["kind"]
  /** Away from a colleague or a zone (its own icon and colour). */
  isAway?: boolean
}) => {
  const getIcon = () => {
    if (!isAway) return KIND_ICONS[kind]

    return kind === "zone" ? CircleOff : UserX
  }
  const Icon = getIcon()

  return (
    <span className={clsx(TILE, isAway ? TONES.away : TONES[getKindTone(kind)])}>
      <Icon className={clsx("size-[18px]", kind === "favorite" && "fill-current")} />
    </span>
  )
}

/** A preference, as its row shows it: a person's face, a zone's colour, a seat's star. */
export const RuleTile = ({ rule }: { rule: SeatRule }) => {
  const zoneColors = useZoneColors()

  if (rule.kind === "colleague")
    return (
      <Face
        email={rule.email}
        className={clsx(
          "size-10 text-[15px]",
          isAwayRule(rule) && "ring-2 ring-danger ring-offset-2 ring-offset-overlay"
        )}
      />
    )

  if (rule.kind === "zone") {
    const color = zoneColors.get(rule.zone)

    // Away from it: red, its colour kept in the dot.
    const isAway = isAwayRule(rule)

    return (
      <span
        className={clsx(TILE, isAway ? TONES.away : TONES.neutral)}
        style={isAway ? undefined : getZoneTint(color)}
      >
        <span className="size-3.5 rounded-full" style={{ background: color }} />
      </span>
    )
  }

  return <KindTile kind={rule.kind} />
}
