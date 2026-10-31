import clsx from "clsx"
import { Moon, Sun } from "lucide-react"
import type { CSSProperties } from "react"
import { daylight } from "../../lighting/daylight"
import { useI18n } from "~/i18n/I18nProvider"

/** The track: the sky across 24 h (night → dawn → day → dusk → night). */
const SKY = [
  [0, "#151a2b"],
  [4.5, "#20243b"],
  [6, "#4d4670"],
  [7, "#c98a86"],
  [8, "#f3b27d"],
  [9.5, "#b9dcf0"],
  [12, "#8fc8ec"],
  [16, "#a4d2ee"],
  [17.5, "#f5c98c"],
  [18.5, "#e88c5b"],
  [19.5, "#6b4f7c"],
  [21, "#262a44"],
  [24, "#151a2b"],
] as const
const GRADIENT = `linear-gradient(90deg, ${SKY.map(([hour, color]) => `${color} ${(hour / 24) * 100}%`).join(", ")})`

/** Stars over the night stretches of the track: [left %, top %, size px, delay s]. */
const STARS: [number, number, number, number][] = [
  [3, 30, 1.5, 0],
  [8, 62, 1, 0.8],
  [13, 38, 2, 1.4],
  [17.5, 66, 1, 0.3],
  [86, 34, 1.5, 1.1],
  [91, 64, 2, 0.5],
  [96, 42, 1, 1.7],
]

const formatHour = (t: number) => {
  const hours = Math.floor(t) % 24
  const minutes = Math.round((t - Math.floor(t)) * 60)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/**
 * Time-of-day slider, a little sky: the track is a 24 h sky and
 * the knob is a pill showing the time, with a sun that turns into a moon as
 * night falls (the scene's own `daylight()` nightness also tints its glow). A
 * real, invisible range input sits on top, so dragging, clicking the track,
 * arrow keys and screen readers all work natively.
 */
export const SkySlider = ({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (hour: number) => void
  className?: string
}) => {
  const night = daylight(value).nightness
  const { t } = useI18n()

  return (
    <div
      className={clsx("sky-slider", className)}
      data-night={night > 0.5 || undefined}
      style={{ "--sky-t": value / 24, "--sky-night": night } as CSSProperties}
    >
      <span className="ss-track" style={{ background: GRADIENT }} aria-hidden>
        {STARS.map(([left, top, size, delay]) => (
          <span
            key={`${left}-${top}`}
            className="ss-star"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </span>
      <span className="ss-thumb" aria-hidden>
        <span className="ss-icon">
          <Sun className="ss-sun" strokeWidth={2.5} />
          <Moon className="ss-moon" fill="currentColor" strokeWidth={2} />
        </span>
        {formatHour(value)}
      </span>
      <input
        type="range"
        min={0}
        max={24}
        step={0.25}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={t("Time of day")}
        aria-valuetext={formatHour(value)}
        className="ss-input"
      />
    </div>
  )
}
