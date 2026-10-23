import clsx from "clsx"
import { useId } from "react"

/** The Dusk palette: night blue, and the three contour lines warm to cool. */
export const DUSK = {
  night: "#2c3866",
  lines: ["#f6c560", "#ef8a5b", "#d1607e"],
} as const

/**
 * The Hotseat mark (same as the favicon): three contour lines across a slope
 * on a night-blue tile — the app's terrain, at dusk.
 */
export const HotseatMark = ({ size = 40, className }: { size?: number; className?: string }) => {
  const clip = useId()
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={clsx("shrink-0", className)}
    >
      <clipPath id={clip}>
        <rect width="64" height="64" rx="14" />
      </clipPath>
      <rect width="64" height="64" rx="14" fill={DUSK.night} />
      <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round" strokeWidth={5.5}>
        <path d="M-4 28C14 18 30 16 46 22S62 28 68 26" stroke={DUSK.lines[0]} />
        <path d="M-4 40C14 29.1 30 26.8 46 33.7S62 40.6 68 38.3" stroke={DUSK.lines[1]} />
        <path d="M-4 52C14 40.2 30 37.6 46 45.4S62 53.2 68 50.6" stroke={DUSK.lines[2]} />
      </g>
    </svg>
  )
}

/** Mark + "hotseat" wordmark side by side — for headers and bars. */
export const HotseatLockup = ({ size = 40, className }: { size?: number; className?: string }) => (
  <span className={clsx("inline-flex items-center gap-3", className)}>
    <HotseatMark size={size} />
    <span className="font-black tracking-[-0.02em] leading-none" style={{ fontSize: size * 0.65 }}>
      hotseat
    </span>
  </span>
)
