import type { ReactNode } from "react"

/**
 * Top-down drawing for the simple view: world x / z map straight onto the
 * plan (plan units = metres; the SVG scales them to pixels), and height (y)
 * only decides what lies on top. The furniture symbols are in ./kits.
 */

/** A colour darkened (factor < 1) — edges and shadows. */
export const shade = (hex: string, factor: number) => {
  const n = parseInt(hex.replace("#", ""), 16)
  const c = (v: number) =>
    Math.round(Math.min(255, v * factor))
      .toString(16)
      .padStart(2, "0")
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}

/** A colour blended `amount` (0…1) of the way toward another. */
export const mix = (hex: string, toward: string, amount: number) => {
  const rgb = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = rgb(hex)
  const b = rgb(toward)
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * amount)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`
}

/** World-space extent of something drawn: for layering and fitting. */
export interface Extent {
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
}

/** One thing to draw, with its extent (drawables are layered bottom to top). */
export interface Drawable {
  ext: Extent
  node: ReactNode
  /** Insertion order: the tie-break between parts at the same height. */
  order: number
}

/** A flat rectangle on the floor (rugs, rooms) — no edge. */
export const floorRect = (
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  props: React.SVGProps<SVGRectElement>,
  key?: string
): ReactNode => <rect key={key} x={x0} y={z0} width={x1 - x0} height={z1 - z0} {...props} />

/** Bottom to top: what stands higher covers what's under it. */
export const sortBottomToTop = (items: Drawable[]): Drawable[] =>
  [...items].sort((a, b) => a.ext.y1 - b.ext.y1 || a.ext.y0 - b.ext.y0 || a.order - b.order)
