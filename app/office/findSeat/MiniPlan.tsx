import clsx from "clsx"
import type { MatchDesk } from "./matching"

/** A desk's drawn size on the plan (m). */
const DESK_WIDTH = 1.4
const DESK_DEPTH = 0.8
/** How much of the floor it shows round the desk (m): its neighbourhood, not the whole floor. */
const VIEW_WIDTH = 16
const VIEW_DEPTH = 7

/**
 * The desks round the one found, from above: it highlighted, the colleagues
 * you'd sit near marked, the rest quiet — where it is at a glance.
 */
export const MiniPlan = ({
  desks,
  highlightId,
  colleagueIds,
  label,
}: {
  /** The desks on its floor. */
  desks: MatchDesk[]
  highlightId: string
  colleagueIds: string[]
  /** What it shows, for screen readers. */
  label: string
}) => {
  const highlighted = desks.find((desk) => desk.id === highlightId)
  if (!highlighted) return null

  const minX = highlighted.x - VIEW_WIDTH / 2
  const minZ = highlighted.z - VIEW_DEPTH / 2

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${minX} ${minZ} ${VIEW_WIDTH} ${VIEW_DEPTH}`}
      preserveAspectRatio="xMidYMid slice"
      className="h-40 w-full rounded-2xl border-2 border-border bg-surface-tertiary"
    >
      {desks.map((desk) => (
        <rect
          key={desk.id}
          x={desk.x - DESK_WIDTH / 2}
          y={desk.z - DESK_DEPTH / 2}
          width={DESK_WIDTH}
          height={DESK_DEPTH}
          rx={0.18}
          className={clsx(
            desk.id === highlightId && "fill-accent",
            desk.id !== highlightId && colleagueIds.includes(desk.id) && "fill-accent/45",
            desk.id !== highlightId && !colleagueIds.includes(desk.id) && "fill-border"
          )}
        />
      ))}
      <rect
        x={highlighted.x - DESK_WIDTH / 2 - 0.35}
        y={highlighted.z - DESK_DEPTH / 2 - 0.35}
        width={DESK_WIDTH + 0.7}
        height={DESK_DEPTH + 0.7}
        rx={0.4}
        fill="none"
        strokeWidth={0.18}
        className="stroke-accent"
      />
    </svg>
  )
}
