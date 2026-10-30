/**
 * The way to a desk on the plan: a glowing line — a blurred halo, a solid
 * core with a light sheen — with streaks of light running toward the desk,
 * and a glowing dot at the entrance. Plan units; strokes in screen pixels, and
 * the blur sized from the zoom (`zoom`), so it looks the same at any zoom.
 */
export const RoutePath = ({ points, k: zoom }: { points: [number, number][]; k: number }) => {
  const path = points.map(([x, z], i) => `${i ? "L" : "M"}${x.toFixed(3)} ${z.toFixed(3)}`).join("")
  const [startX, startZ] = points[0]
  // The filter's own box: the route's, with room for the glow.
  const xs = points.map((point) => point[0])
  const zs = points.map((point) => point[1])
  const padding = 40 / zoom
  const box = {
    x: Math.min(...xs) - padding,
    y: Math.min(...zs) - padding,
    width: Math.max(...xs) - Math.min(...xs) + padding * 2,
    height: Math.max(...zs) - Math.min(...zs) + padding * 2,
  }
  const line = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  }

  return (
    <g aria-hidden pointerEvents="none">
      <defs>
        <filter id="route-glow" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={6 / zoom} />
        </filter>
        <filter id="route-shine" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation={2.5 / zoom} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={path}
        {...line}
        stroke="var(--accent)"
        strokeOpacity={0.55}
        strokeWidth={16}
        filter="url(#route-glow)"
      />
      <path d={path} {...line} stroke="var(--accent)" strokeWidth={4.5} />
      <path d={path} {...line} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={1.5} />
      <path
        d={path}
        {...line}
        className="route-flow"
        stroke="#ffffff"
        strokeWidth={4}
        strokeDasharray="10 70"
        filter="url(#route-shine)"
      />
      <circle
        cx={startX}
        cy={startZ}
        r={0.5}
        fill="var(--accent)"
        fillOpacity={0.45}
        filter="url(#route-glow)"
      />
      <circle
        cx={startX}
        cy={startZ}
        r={0.17}
        fill="var(--accent)"
        stroke="#ffffff"
        strokeWidth={0.05}
      />
    </g>
  )
}
