import clsx from "clsx"
import type { CSSProperties, MouseEvent } from "react"
import { flushSync } from "react-dom"
import { Theme, useTheme } from "remix-themes"

const SIZES = {
  // track width / height, thumb size, inner padding (px)
  md: { w: 56, h: 30, k: 24, pad: 3 },
  lg: { w: 84, h: 44, k: 36, pad: 4 },
} as const

/** Rays around the sun (degrees). */
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315]
/** Stars on the night sky: [left %, top %, size px, delay s]. */
const STARS: [number, number, number, number][] = [
  [18, 26, 2, 0],
  [30, 62, 1.5, 0.7],
  [44, 22, 2.5, 1.3],
  [52, 70, 1.5, 0.4],
  [26, 44, 1, 1.8],
]

/**
 * A little sky: day (warm gradient, drifting clouds, a sun) ⇄ night (dusk
 * gradient, twinkling stars, the sun rolling across and becoming a cratered
 * moon). Switching also reveals the new theme across the page as a circle
 * growing from the switch (View Transitions API) — skipped where unsupported or
 * with reduced motion, where the theme simply changes.
 */
export const ThemeSwitcher = ({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES
  className?: string
}) => {
  const [theme, setTheme] = useTheme()
  const dark = theme === Theme.DARK
  const s = SIZES[size]

  const toggle = (e: MouseEvent<HTMLButtonElement>) => {
    const next = dark ? Theme.LIGHT : Theme.DARK
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!document.startViewTransition || reduce) return setTheme(next)

    // Circular reveal from the switch's centre to the farthest corner.
    const r = e.currentTarget.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next))
    })
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: 650,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      )
      .catch(() => {})
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      onClick={toggle}
      data-dark={dark}
      className={clsx("theme-switch", className)}
      style={
        {
          "--ts-w": `${s.w}px`,
          "--ts-h": `${s.h}px`,
          "--ts-k": `${s.k}px`,
          "--ts-pad": `${s.pad}px`,
        } as CSSProperties
      }
    >
      <span className="ts-sky ts-day" aria-hidden />
      <span className="ts-sky ts-night" aria-hidden />
      <span className="ts-clouds" aria-hidden>
        <span className="ts-cloud ts-cloud-a" />
        <span className="ts-cloud ts-cloud-b" />
      </span>
      <span className="ts-stars" aria-hidden>
        {STARS.map(([left, top, px, delay]) => (
          <span
            key={`${left}-${top}`}
            className="ts-star"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: px,
              height: px,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </span>
      <span className="ts-thumb" aria-hidden>
        <span className="ts-rays">
          {RAYS.map((deg) => (
            <span key={deg} className="ts-ray" style={{ transform: `rotate(${deg}deg)` }} />
          ))}
        </span>
        <span className="ts-orb">
          <span className="ts-sun" />
          <span className="ts-moon">
            <span className="ts-crater" style={{ left: "24%", top: "30%", width: "26%" }} />
            <span className="ts-crater" style={{ left: "56%", top: "52%", width: "18%" }} />
            <span className="ts-crater" style={{ left: "38%", top: "66%", width: "12%" }} />
          </span>
        </span>
      </span>
    </button>
  )
}
