import clsx from "clsx"
import type { CSSProperties, ReactNode } from "react"
import { getTeamHex } from "~/utils/teams"

/**
 * A team's colours on a surface: a soft tint of it behind, and text of it
 * mixed toward the foreground — darker in light mode, lighter in dark — so
 * it reads on the tint either way.
 */
export const getTeamTint = (color: string): CSSProperties => {
  const hex = getTeamHex(color)

  return {
    background: `color-mix(in oklab, ${hex} 18%, transparent)`,
    color: `color-mix(in oklab, ${hex} 62%, var(--foreground))`,
  }
}

/** A team's first letters ("Design" → "De", "Frontend guild" → "FG"). */
export const getTeamInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)

  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name
        .trim()
        .slice(0, 2)
        .replace(/^./, (letter) => letter.toUpperCase())
}

/** A team's colour as a dot. */
export const TeamDot = ({ color, className }: { color: string; className?: string }) => (
  <span
    aria-hidden
    className={clsx("inline-block shrink-0 rounded-full", className ?? "size-2.5")}
    style={{ background: getTeamHex(color) }}
  />
)

/** A team as a rounded tile with its initials, on its tint. */
export const TeamTile = ({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) => (
  <span
    aria-hidden
    className={clsx(
      "grid shrink-0 place-items-center font-black",
      className ?? "size-11 rounded-[14px] text-sm"
    )}
    style={getTeamTint(color)}
  >
    {getTeamInitials(name)}
  </span>
)

/** A team as a pill: its dot and name (and anything after, like its days). */
export const TeamChip = ({
  name,
  color,
  children,
  className,
}: {
  name: string
  color: string
  children?: ReactNode
  className?: string
}) => (
  <span
    className={clsx(
      "inline-flex max-w-full items-center gap-1.5 rounded-full font-extrabold",
      className ?? "h-7 px-2.5 text-xs"
    )}
    style={getTeamTint(color)}
  >
    <TeamDot color={color} className="size-2" />
    <span className="truncate">{name}</span>
    {children}
  </span>
)
