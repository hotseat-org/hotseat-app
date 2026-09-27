import type { ReactNode } from "react"

/**
 * Isometric projection for the simple (no-WebGL) view: world units (x, y up,
 * z) to plan units — seen from the +x/+z corner like the 3D camera, so the
 * two visible sides of a box are its +z face (front-left) and +x face
 * (front-right). The SVG scales plan units to pixels.
 */
const C30 = Math.cos(Math.PI / 6)
export const project = (x: number, y: number, z: number): [number, number] => [
  (x - z) * C30,
  (x + z) * 0.5 - y,
]

const pts = (corners: [number, number, number][]) =>
  corners.map(([x, y, z]) => project(x, y, z).join(",")).join(" ")

/** A colour darkened (factor < 1) — the shaded sides of a box. */
export const shade = (hex: string, factor: number) => {
  const n = parseInt(hex.replace("#", ""), 16)
  const c = (v: number) =>
    Math.round(Math.min(255, v * factor))
      .toString(16)
      .padStart(2, "0")
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`
}
const SIDE_Z = 0.86
const SIDE_X = 0.72

/** World-space extent of something drawn: for depth sorting and fitting. */
export interface Extent {
  x0: number
  x1: number
  z0: number
  z1: number
  y0: number
  y1: number
}

/** One thing to draw, with its extent (drawables are sorted back to front). */
export interface Drawable {
  ext: Extent
  /** Extent used for depth sorting when it differs from the drawn one (walls). */
  sort?: Extent
  node: ReactNode
  /** Insertion order: the tie-break between pieces at the same depth. */
  order: number
}

/** An axis-aligned box: top and the two visible sides, shaded. */
export const boxNode = (e: Extent, color: string, opacity = 1): ReactNode => {
  const { x0, x1, z0, z1, y0, y1 } = e
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <polygon
        points={pts([
          [x0, y1, z1],
          [x1, y1, z1],
          [x1, y0, z1],
          [x0, y0, z1],
        ])}
        fill={shade(color, SIDE_Z)}
      />
      <polygon
        points={pts([
          [x1, y1, z0],
          [x1, y1, z1],
          [x1, y0, z1],
          [x1, y0, z0],
        ])}
        fill={shade(color, SIDE_X)}
      />
      <polygon
        points={pts([
          [x0, y1, z0],
          [x1, y1, z0],
          [x1, y1, z1],
          [x0, y1, z1],
        ])}
        fill={color}
      />
    </g>
  )
}

/**
 * An upright cylinder (table tops, pots, stools). A ground circle of radius r
 * projects to an ellipse r·√2·cos30 wide and r·√2·½ tall.
 */
export const cylinderNode = (
  cx: number,
  cz: number,
  r: number,
  y0: number,
  y1: number,
  color: string
): ReactNode => {
  const rx = r * Math.SQRT2 * C30
  const ry = r * Math.SQRT2 * 0.5
  const [tx, ty] = project(cx, y1, cz)
  const [, by] = project(cx, y0, cz)
  const side = shade(color, 0.8)
  return (
    <g>
      <ellipse cx={tx} cy={by} rx={rx} ry={ry} fill={side} />
      <rect x={tx - rx} y={ty} width={rx * 2} height={by - ty} fill={side} />
      <ellipse cx={tx} cy={ty} rx={rx} ry={ry} fill={color} />
    </g>
  )
}

/** A flat shape on the floor (rugs, rooms, desk footprints). */
export const floorPolygon = (
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  props: React.SVGProps<SVGPolygonElement>,
  key?: string
): ReactNode => (
  <polygon
    key={key}
    points={pts([
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ])}
    {...props}
  />
)

/**
 * Painter's order for axis-aligned pieces: A is drawn before B when A lies
 * behind B — entirely at smaller x or smaller z (the viewer is at +x/+z) — or,
 * stacked on the same spot, lower. A topological sort of those constraints;
 * anything left in a cycle falls back to its distance along the view axis.
 */
export const sortBackToFront = (items: Drawable[]): Drawable[] => {
  const n = items.length
  const EPS = 1e-6
  /** Pieces that merely touch (or overlap by a hair) still count as apart. */
  const TOUCH = 0.02
  const behind = (a: Extent, b: Extent) => {
    if (a.x1 <= b.x0 + TOUCH || a.z1 <= b.z0 + TOUCH) return true // a is behind b
    if (b.x1 <= a.x0 + TOUCH || b.z1 <= a.z0 + TOUCH) return false
    return a.y0 < b.y0 - EPS || (Math.abs(a.y0 - b.y0) < EPS && a.y1 < b.y1 - EPS)
  }
  // Pieces that can't overlap on screen need no ordering constraint.
  const sb = items.map((it) => screenBounds(it.ext))
  const overlapsOnScreen = (i: number, j: number) =>
    sb[i].x0 < sb[j].x1 && sb[j].x0 < sb[i].x1 && sb[i].y0 < sb[j].y1 && sb[j].y0 < sb[i].y1
  const after: number[][] = Array.from({ length: n }, () => [])
  const indeg = new Array(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (!overlapsOnScreen(i, j)) continue
      const a = items[i].sort ?? items[i].ext
      const b = items[j].sort ?? items[j].ext
      if (behind(a, b)) {
        after[i].push(j)
        indeg[j]++
      } else if (behind(b, a)) {
        after[j].push(i)
        indeg[i]++
      }
    }
  const depth = (it: Drawable) => {
    const e = it.sort ?? it.ext
    return (e.x0 + e.x1 + e.z0 + e.z1) / 2 + (e.y0 + e.y1) * 0.01
  }
  const ready = items.map((_, i) => i).filter((i) => indeg[i] === 0)
  const out: Drawable[] = []
  const done = new Array(n).fill(false)
  while (out.length < n) {
    if (!ready.length) {
      // A cycle: release the nearest-to-back remaining piece.
      let best = -1
      for (let i = 0; i < n; i++)
        if (!done[i] && (best < 0 || depth(items[i]) < depth(items[best]))) best = i
      indeg[best] = 0
      ready.push(best)
    }
    ready.sort((a, b) => depth(items[b]) - depth(items[a]) || items[b].order - items[a].order)
    const i = ready.pop() as number
    if (done[i]) continue
    done[i] = true
    out.push(items[i])
    for (const j of after[i]) if (--indeg[j] === 0 && !done[j]) ready.push(j)
  }
  return out
}

/** Projected (plan-unit) bounds of an extent. */
export const screenBounds = (e: Extent) => {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const x of [e.x0, e.x1])
    for (const z of [e.z0, e.z1])
      for (const y of [e.y0, e.y1]) {
        const [px, py] = project(x, y, z)
        x0 = Math.min(x0, px)
        x1 = Math.max(x1, px)
        y0 = Math.min(y0, py)
        y1 = Math.max(y1, py)
      }
  return { x0, x1, y0, y1 }
}
