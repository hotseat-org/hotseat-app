import type { ReactNode } from "react"
import { FLOOR_PART, SEG, enclosedRegions, getCellKey, type FloorCell } from "../../layout"
import type { SceneObject } from "../../types"
import { floorRect } from "../shapes"

/**
 * The floor: rooms (each in its floor paint) as row-merged strips, grouped by
 * colour — one `<g fill>` per colour.
 */
export const drawFloor = (objects: SceneObject[], floorInside: string): ReactNode => {
  const paints = objects.filter((object) => object.type === "floorPaint" && object.color)
  const colorOf = new Map<string, string>()
  const rooms = new Map<string, ReactNode[]>()
  for (const region of enclosedRegions(objects)) {
    const paint = [...paints]
      .reverse()
      .find((floorPaint) =>
        region.some(
          (cell) =>
            cell.x <= floorPaint.x &&
            floorPaint.x < cell.x + SEG &&
            cell.z <= floorPaint.z &&
            floorPaint.z < cell.z + SEG
        )
      )
    const color = paint?.color ?? floorInside
    for (const cell of region) {
      if (cell.parts === undefined) {
        colorOf.set(getCellKey(cell.x, cell.z), color)
        continue
      }

      // A square a diagonal wall cuts: just its quarters inside the room.
      const list = rooms.get(color) ?? []
      list.push(<path key={`cut ${getCellKey(cell.x, cell.z)}`} d={cutSquarePath(cell)} />)
      rooms.set(color, list)
    }
  }
  const rows = new Map<number, number[]>()
  for (const key of colorOf.keys()) {
    const [x, z] = key.split(",").map(Number)
    rows.set(z, [...(rows.get(z) ?? []), x])
  }
  for (const [z, xs] of rows) {
    xs.sort((first, second) => first - second)
    const color = (x: number) => colorOf.get(getCellKey(x, z)) as string
    let start = xs[0]
    let prev = xs[0]
    const flush = () => {
      const list = rooms.get(color(start)) ?? []
      // A hair taller than the row, so neighbouring strips leave no hairline.
      list.push(
        floorRect(
          { from: { x: start, z }, to: { x: prev + SEG, z: z + SEG + 0.005 } },
          {},
          `${z},${start}`
        )
      )
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
const cutSquarePath = (cell: FloorCell) => {
  const [minX, minZ, maxX, maxZ] = [cell.x, cell.z, cell.x + SEG, cell.z + SEG]
  const [centreX, centreZ] = [cell.x + SEG / 2, cell.z + SEG / 2]
  const quarters: [number, [number, number], [number, number]][] = [
    [FLOOR_PART.south, [minX, minZ], [maxX, minZ]],
    [FLOOR_PART.east, [maxX, minZ], [maxX, maxZ]],
    [FLOOR_PART.north, [maxX, maxZ], [minX, maxZ]],
    [FLOOR_PART.west, [minX, maxZ], [minX, minZ]],
  ]

  return quarters
    .filter(([part]) => (cell.parts ?? 0) & part)
    .map(([, from, to]) => `M${from[0]} ${from[1]}L${to[0]} ${to[1]}L${centreX} ${centreZ}Z`)
    .join("")
}
