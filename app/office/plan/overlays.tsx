import clsx from "clsx"
import { Pin } from "lucide-react"
import type { CSSProperties } from "react"
import { getDeskTagTone } from "../desks/deskTagTone"
import { heatColor } from "../heatmap/heatmap"
import type { Person } from "../desks/people"
import { SeatAvatar } from "../desks/SeatAvatar"
import { ZONE_LETTER_HEIGHT, type Zone } from "../zones/zones"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The HTML laid over the plan's drawing: legible at any zoom, each centred on
 * its spot (`style`: where it is on screen, see FloorPlan's `screen`).
 */

/** A booked desk: who sits there (tap for the desk's card). */
export const Occupant = ({
  person,
  email,
  isMine,
  teamColor,
  size,
  style,
  onClick,
}: {
  person: Person | null
  email: string
  isMine: boolean
  /** A teammate: your team's colour. */
  teamColor?: string
  size: number
  style: CSSProperties
  onClick: (event: React.MouseEvent) => void
}) => {
  const { t } = useI18n()
  const getOccupantName = () => {
    if (!person) return t("Taken")

    return isMine ? t("You") : person.name
  }
  const name = getOccupantName()

  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      onClick={onClick}
      // A finger-sized hit area round the small avatar.
      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full before:absolute before:-inset-2 before:rounded-full before:content-['']"
      style={style}
    >
      <SeatAvatar person={person} email={email} isMine={isMine} teamColor={teamColor} size={size} />
    </button>
  )
}

/** A desk's name tag: its label, who sits there, a pin for a permanent desk. */
export const DeskTag = ({
  person,
  label,
  mine,
  free,
  resident,
}: {
  person: { name: string } | null
  label?: string
  mine: boolean
  free: boolean
  resident: boolean
}) => {
  const { t } = useI18n()

  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[11px] font-bold shadow-overlay",
        getDeskTagTone(mine, free)
      )}
    >
      {label && <span className="opacity-80">{label}</span>}
      {/* First name only: neighbouring desks' tags would collide. */}
      {person && <span>{mine ? t("You") : person.name.split(" ")[0]}</span>}
      {resident && <Pin className="size-3 opacity-70" aria-label={t("Permanent desk")} />}
    </div>
  )
}

/** Where the way ends: a ring pulsing round the desk's chair. */
export const RouteEnd = ({ size, style }: { size: number; style: CSSProperties }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
    style={{ ...style, width: size, height: size }}
  >
    <span className="route-pulse absolute inset-0 rounded-full border-[3px] border-accent bg-accent/15 shadow-[0_0_16px_2px_var(--accent),inset_0_0_10px_var(--accent)]" />
  </div>
)

/** The spotlit desk: rings ripple out from it. */
export const SpotlightRing = ({ size, style }: { size: number; style: CSSProperties }) => (
  <div
    aria-hidden
    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
    style={{ ...style, width: size, height: size }}
  >
    <span className="absolute inset-0 rounded-full border-[3px] border-accent bg-accent/15" />
    <span className="spotlight absolute inset-0 rounded-full border-[3px] border-accent" />
  </div>
)

/** Heatmap: a desk's share of days in use. */
export const HeatTag = ({
  label,
  ratio,
  isDark,
  style,
}: {
  label?: string
  ratio: number
  isDark: boolean
  style: CSSProperties
}) => (
  <div className="group absolute -translate-x-1/2 -translate-y-1/2 hover:z-10" style={style}>
    {/* Just the share (desks sit close together); the desk on hover. */}
    <span className="flex cursor-default items-center gap-1 whitespace-nowrap rounded-full border border-foreground/20 bg-overlay px-1.5 text-[10px] font-extrabold leading-4 text-foreground shadow-overlay">
      {label && <span className="hidden opacity-70 group-hover:inline">{label}</span>}
      {/* The bar chart, flat: as full as the desk's share of days. */}
      <span aria-hidden className="h-1.5 w-5 overflow-hidden rounded-full bg-foreground/10">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.max(4, ratio * 100)}%`, background: heatColor(ratio, isDark) }}
        />
      </span>
      {Math.round(ratio * 100)}%
    </span>
  </div>
)

/** A zone's name, on its floor. */
/**
 * A zone's name lettered on its floor, like a district on a map: spaced
 * capitals in its colour, faint, along its longer side — too small to read
 * (far out), left out.
 */
export const ZoneLetters = ({
  zone,
  isAlongX,
  zoom,
  style,
}: {
  zone: Zone
  isAlongX: boolean
  zoom: number
  style: CSSProperties
}) => {
  const size = ZONE_LETTER_HEIGHT * zoom * 0.75
  if (size < 7) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute whitespace-nowrap font-black uppercase leading-none"
      style={{
        ...style,
        fontSize: size,
        letterSpacing: "0.14em",
        color: zone.color,
        opacity: 0.75,
        transform: `translate(-50%, -50%) rotate(${isAlongX ? 0 : -90}deg)`,
      }}
    >
      {zone.name}
    </div>
  )
}

export const ZoneName = ({ zone, style }: { zone: Zone; style: CSSProperties }) => (
  <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={style}>
    <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-overlay px-2 py-0.5 text-[11px] font-bold text-foreground shadow-sm">
      <span className="size-2 rounded-full" style={{ background: zone.color }} />
      {zone.name}
    </span>
  </div>
)
