import type { CSSProperties } from "react"

// Two families of parallel lines → an isometric grid.
const isoGrid = (color: string): string =>
  [
    `repeating-linear-gradient(26.57deg, transparent 0 26px, ${color} 26px 27px)`,
    `repeating-linear-gradient(-26.57deg, transparent 0 26px, ${color} 26px 27px)`,
  ].join(", ")

const gridStyle: CSSProperties = {
  backgroundImage: isoGrid("color-mix(in oklch, var(--foreground) 12%, transparent)"),
}

// Fade grid + shine toward the edges so it dissolves into the background.
const maskStyle: CSSProperties = {
  WebkitMaskImage: "radial-gradient(120% 100% at 50% 40%, #000 38%, transparent 82%)",
  maskImage: "radial-gradient(120% 100% at 50% 40%, #000 38%, transparent 82%)",
}

const SHINE_COLORS = ["var(--brand)", "var(--accent)", "var(--warning)"]

// Deterministic glints (stable across SSR/CSR): twinkling dots at random spots.
const GLINTS = Array.from({ length: 22 }, (_, i) => {
  const s = i * 8 + 3
  return {
    top: ((s * 13) % 84) + 6,
    left: ((s * 17) % 88) + 6,
    size: 2 + (i % 3),
    duration: 3 + (i % 5) * 0.9,
    delay: ((s * 11) % 45) / 10,
    color: SHINE_COLORS[i % SHINE_COLORS.length],
  }
})

/**
 * Isometric office floor behind empty-office screens: a dim grid sprinkled with
 * small glowing dots that twinkle at random spots. Decorative; pointer-events-none.
 */
export const OfficeFloor = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    style={maskStyle}
  >
    <div className="absolute inset-0" style={gridStyle} />
    {GLINTS.map((g, i) => (
      <span
        key={i}
        className="grid-shine-dot absolute rounded-full"
        style={{
          top: `${g.top}%`,
          left: `${g.left}%`,
          width: g.size,
          height: g.size,
          background: g.color,
          boxShadow: `0 0 8px 2px ${g.color}`,
          animation: `grid-shine ${g.duration}s ease-in-out ${g.delay}s infinite`,
        }}
      />
    ))}
  </div>
)
