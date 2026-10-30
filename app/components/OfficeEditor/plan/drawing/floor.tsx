import type { ReactNode } from "react"
import { FLOOR_PART, SEG, enclosedRegions, type FloorCell } from "../../layout"
import type { SceneObject } from "../../types"
import { floorRect } from "../shapes"

/**
 * The floor: rooms (each in its floor paint) as row-merged strips, grouped by
 * colour — one `<g fill>` per colour.
 */
export const drawFloor = (objects: SceneObject[], floorInside: string): ReactNode => {
  const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
  const colorOf = new Map<string, string>()
  const rooms = new Map<string, ReactNode[]>()
  for (const region of enclosedRegions(objects)) {
    const paint = [...paints]
      .reverse()
      .find((p) =>
        region.some((c) => c.x <= p.x && p.x < c.x + SEG && c.z <= p.z && p.z < c.z + SEG)
      )
    const color = paint?.color ?? floorInside
    for (const c of region) {
      if (c.parts === undefined) {
        colorOf.set(`${c.x},${c.z}`, color)
        continue
      }
      // A square a diagonal wall cuts: just its quarters inside the room.
      const list = rooms.get(color) ?? []
      list.push(<path key={`cut ${c.x},${c.z}`} d={cutSquarePath(c)} />)
      rooms.set(color, list)
    }
  }
  const rows = new Map<number, number[]>()
  for (const key of colorOf.keys()) {
    const [x, z] = key.split(",").map(Number)
    rows.set(z, [...(rows.get(z) ?? []), x])
  }
  for (const [z, xs] of rows) {
    xs.sort((p, q) => p - q)
    const color = (x: number) => colorOf.get(`${x},${z}`) as string
    let start = xs[0]
    let prev = xs[0]
    const flush = () => {
      const list = rooms.get(color(start)) ?? []
      // A hair taller than the row, so neighbouring strips leave no hairline.
      list.push(floorRect(start, z, prev + SEG, z + SEG + 0.005, {}, `${z},${start}`))
      rooms.set(color(start), list)
    }
    for (const x of xs.slice(1)) {
      if (Math.abs(x - prev - SEG) > 1e-6 || color(x) !== color(start)) {
        flush()
        start = x
      }
      prev = x
    }
    flush()
  }
  return [...rooms].map(([color, list]) => (
    <g key={color} fill={color}>
      {list}
    </g>
  ))
}

/** The quarters of a cut square that are inside (FLOOR_PART bits), as one SVG path. */
const cutSquarePath = (c: FloorCell) => {
  const [x0, z0, x1, z1] = [c.x, c.z, c.x + SEG, c.z + SEG]
  const [cx, cz] = [c.x + SEG / 2, c.z + SEG / 2]
  const quarters: [number, [number, number], [number, number]][] = [
    [FLOOR_PART.south, [x0, z0], [x1, z0]],
    [FLOOR_PART.east, [x1, z0], [x1, z1]],
    [FLOOR_PART.north, [x1, z1], [x0, z1]],
    [FLOOR_PART.west, [x0, z1], [x0, z0]],
  ]
  return quarters
    .filter(([part]) => (c.parts ?? 0) & part)
    .map(([, a, b]) => `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${cx} ${cz}Z`)
    .join("")
}
