import type { ReactNode } from "react"
import { lerp } from "../math"
import type { Cell } from "../types"

/**
 * Top-down drawing for the simple view: world x / z map straight onto the
 * plan (plan units = metres; the SVG scales them to pixels), and height (y)
 * only decides what lies on top. The furniture symbols are in ./kits.
 */

/** A colour darkened (factor < 1) — edges and shadows. */
export const shade = (hex: string, factor: number) => {
  const value = parseInt(hex.replace("#", ""), 16)
  const toHex = (channel: number) =>
    Math.round(Math.min(255, channel * factor))
      .toString(16)
      .padStart(2, "0")

  return `#${toHex((value >> 16) & 255)}${toHex((value >> 8) & 255)}${toHex(value & 255)}`
}

/** A colour blended `amount` (0…1) of the way toward another. */
export const mix = (hex: string, toward: string, amount: number) => {
  const rgb = (color: string) => {
    const value = parseInt(color.replace("#", ""), 16)

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const first = rgb(hex)
  const second = rgb(toward)

  return `#${first
    .map((channel, i) =>
      Math.round(lerp(channel, second[i], amount))
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
  extent: Extent
  node: ReactNode
  /** Insertion order: the tie-break between parts at the same height. */
  order: number
}

/** A flat rectangle on the floor (rugs, rooms) — no edge. */
export const floorRect = (
  { from, to }: { from: Cell; to: Cell },
  props: React.SVGProps<SVGRectElement>,
  key?: string
): ReactNode => (
  <rect key={key} x={from.x} y={from.z} width={to.x - from.x} height={to.z - from.z} {...props} />
)

/** Bottom to top: what stands higher covers what's under it. */
export const sortBottomToTop = (items: Drawable[]): Drawable[] =>
  [...items].sort(
    (first, second) =>
      first.extent.y1 - second.extent.y1 ||
      first.extent.y0 - second.extent.y0 ||
      first.order - second.order
  )
