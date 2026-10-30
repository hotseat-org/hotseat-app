/**
 * The way to a desk on the plan: a glowing line — a blurred halo, a solid
 * core with a light sheen — with streaks of light running toward the desk,
 * and a glowing dot at the entrance. Plan units; strokes in screen pixels, and
 * the blur sized from the zoom (`k`), so it looks the same at any zoom.
 */
export const RoutePath = ({ points, k }: { points: [number, number][]; k: number }) => {
  const d = points.map(([x, z], i) => `${i ? "L" : "M"}${x.toFixed(3)} ${z.toFixed(3)}`).join("")
  const [sx, sz] = points[0]
  // The filter's own box: the route's, with room for the glow.
  const xs = points.map((p) => p[0])
  const zs = points.map((p) => p[1])
  const pad = 40 / k
  const box = {
    x: Math.min(...xs) - pad,
    y: Math.min(...zs) - pad,
    width: Math.max(...xs) - Math.min(...xs) + pad * 2,
    height: Math.max(...zs) - Math.min(...zs) + pad * 2,
  }
  const line = {
    d,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  }
  return (
    <g aria-hidden pointerEvents="none">
      <defs>
        <filter id="route-glow" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={6 / k} />
        </filter>
        <filter id="route-shine" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={2.5 / k} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        {...line}
        stroke="var(--accent)"
        strokeOpacity={0.55}
        strokeWidth={16}
        filter="url(#route-glow)"
      />
      <path {...line} stroke="var(--accent)" strokeWidth={4.5} />
      <path {...line} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
      <path
        {...line}
        className="route-flow"
        stroke="#ffffff"
        strokeWidth={4}
        strokeDasharray="10 70"
        filter="url(#route-shine)"
      />
      <circle
        cx={sx}
        cy={sz}
        r={0.5}
        fill="var(--accent)"
        fillOpacity={0.45}
        filter="url(#route-glow)"
      />
      <circle cx={sx} cy={sz} r={0.17} fill="var(--accent)" stroke="#ffffff" strokeWidth={0.05} />
    </g>
  )
}
