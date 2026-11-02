import clsx from "clsx"
import { useEffect, useState, type CSSProperties } from "react"
import { DUSK } from "~/components/HotseatMark"

/**
 * The brand's dusk: the sign-in screen's night sky and its warm horizon
 * lines (the logo's), which the product page stands on too.
 */

/** The page's night blue (a step darker than the mark's tile, so it stands on it). */
export const NIGHT = "#1f2850"

/**
 * The three horizon lines (the logo's, across the whole screen), each as the
 * y's of one curve: start, three control points, the smooth join and the end.
 * They slowly breathe between a few gentle shapes, out of step with each other.
 */
const HORIZON = [
  { color: DUSK.lines[0], y: [650, 560, 540, 600, 700, 650], seconds: 19 },
  { color: DUSK.lines[1], y: [742, 640, 618, 686, 800, 744], seconds: 23 },
  { color: DUSK.lines[2], y: [834, 720, 696, 772, 900, 838], seconds: 27 },
]
/** How each breath bends a line: offsets for the control points, and a sideways sway. */
const BREATHS = [
  { dy: [0, 0, 0, 0, 0, 0], dx: 0 },
  { dy: [6, -16, 10, -14, 10, 4], dx: 40 },
  { dy: [-4, 12, -14, 10, -12, -6], dx: -30 },
]
const curve = (y: number[], { dy, dx }: (typeof BREATHS)[number]) =>
  `M-40 ${y[0] + dy[0]}C${240 + dx} ${y[1] + dy[1]} ${520 + dx} ${y[2] + dy[2]} ${820 + dx} ${y[3] + dy[3]}S1300 ${y[4] + dy[4]} 1500 ${y[5] + dy[5]}`

/** Faint contours higher up the slope, drifting very slowly. */
const CONTOURS = [
  "M-40 300C260 230 560 230 860 280S1320 360 1500 320",
  "M-40 380C260 300 560 300 860 355S1320 440 1500 400",
  "M-40 460C260 372 560 372 860 432S1320 520 1500 480",
]
const STARS = [
  [180, 90, 1.4],
  [420, 150, 1],
  [690, 70, 1.6],
  [980, 130, 1.1],
  [1230, 80, 1.5],
  [1340, 210, 1],
  [90, 230, 1],
  [560, 210, 0.9],
]

/** Motion unless the system asks for less (decided on the client; still on the server). */
export const useIsAnimated = () => {
  const [isAnimated, setIsAnimated] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setIsAnimated(!query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return isAnimated
}

/** The night sky behind everything: stars and a faint slope of contours. */
export const NightSky = ({ isAnimated }: { isAnimated: boolean }) => (
  <svg
    aria-hidden
    viewBox="0 0 1440 900"
    preserveAspectRatio="xMidYMin slice"
    fill="none"
    className="pointer-events-none absolute inset-0 size-full"
  >
    <g stroke="#2e3a6c" strokeWidth={1.5}>
      {isAnimated && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; -36 6; 0 0"
          dur="60s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
      )}
      {CONTOURS.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
    <g fill="#f4efe6">
      {STARS.map(([x, y, r], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={r}
          className="opacity-60 motion-safe:animate-[twinkle_var(--duration)_ease-in-out_var(--delay)_infinite]"
          style={
            { "--duration": `${3 + (i % 4)}s`, "--delay": `${(i * 0.7) % 3}s` } as CSSProperties
          }
        />
      ))}
    </g>
  </svg>
)

/**
 * The three warm lines, as a band along the bottom of the page — in the flow,
 * so whatever the screen's height they never run over the buttons above.
 * Whole: mid-page, where no screen edge hides their lower part, the band is
 * as tall as the lines' breathing needs (on a phone it crops only the sides).
 */
export const Horizon = ({
  isAnimated,
  isWhole = false,
}: {
  isAnimated: boolean
  isWhole?: boolean
}) => (
  <svg
    aria-hidden
    viewBox={isWhole ? "0 490 1440 470" : "0 500 1440 400"}
    preserveAspectRatio="xMidYMin slice"
    fill="none"
    strokeLinecap="round"
    className={clsx(
      "pointer-events-none relative w-full shrink-0",
      isWhole ? "h-[max(150px,32.7vw)]" : "h-[clamp(170px,32vh,340px)]"
    )}
  >
    {HORIZON.map(({ color, y, seconds }, i) => (
      <path key={color} d={curve(y, BREATHS[0])} stroke={color} strokeWidth={30}>
        {isAnimated && (
          <animate
            attributeName="d"
            values={[...BREATHS, BREATHS[0]].map((b) => curve(y, b)).join(";")}
            keyTimes="0;0.33;0.66;1"
            calcMode="spline"
            keySplines="0.45 0 0.55 1; 0.45 0 0.55 1; 0.45 0 0.55 1"
            dur={`${seconds}s`}
            begin={`${-i * 5}s`}
            repeatCount="indefinite"
          />
        )}
      </path>
    ))}
  </svg>
)
