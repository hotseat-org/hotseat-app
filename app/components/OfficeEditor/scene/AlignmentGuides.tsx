import { useMemo } from "react"
import { Line } from "@react-three/drei"
import { footprintCells, isDiagonal } from "../layout"
import { GRID, isEdgeType, isMarker, isOverhead, type ObjectType, type SceneObject } from "../types"

/** Only pieces this near (m) count — a row across the room, not the whole office. */
const REACH = 14
/** Just above the floor and placement highlight. */
const Y = 0.03
/** Equal to within this (m): positions are on the grid, so equal means equal. */
const SAME = 1e-4
const COLOR = "#ff3d8b"

interface Bounds {
  x0: number
  x1: number
  z0: number
  z1: number
  /** Turned off the axes: only its centre lines up, not its edges. */
  isTurned: boolean
}

const boundsOf = (type: ObjectType, rotation: number, x: number, z: number): Bounds => {
  const [cx, cz] = footprintCells(type, rotation)
  return {
    x0: x - (cx * GRID) / 2,
    x1: x + (cx * GRID) / 2,
    z0: z - (cz * GRID) / 2,
    z1: z + (cz * GRID) / 2,
    isTurned: isDiagonal(rotation),
  }
}

/** The lines a piece offers along one axis: its two edges and its centre. */
const linesOf = (b: Bounds, axis: "x" | "z") => {
  const [lo, hi] = axis === "x" ? [b.x0, b.x1] : [b.z0, b.z1]
  return b.isTurned ? [(lo + hi) / 2] : [lo, (lo + hi) / 2, hi]
}

interface Props {
  objects: SceneObject[]
  type: ObjectType
  x: number
  z: number
  rotation: number
  /** The piece being moved (not lined up with itself). */
  ignoreId?: string
}

/**
 * While a piece is placed or dragged: a thin line wherever one of its edges or
 * its centre lines up exactly with nearby pieces', running through all of them
 * — so a row reads as a row, and "almost" is easy to tell from "exactly".
 */
export const AlignmentGuides = ({ objects, type, x, z, rotation, ignoreId }: Props) => {
  const guides = useMemo(() => {
    const moving = boundsOf(type, rotation, x, z)
    const others = objects
      .filter(
        (o) =>
          o.id !== ignoreId &&
          !isEdgeType(o.type) &&
          !isMarker(o.type) &&
          !isOverhead(o.type) &&
          Math.hypot(o.x - x, o.z - z) <= REACH
      )
      .map((o) => boundsOf(o.type, o.rotation, o.x, o.z))
    const result: [number, number, number][][] = []
    for (const axis of ["x", "z"] as const) {
      // A line at a fixed x (or z), running along the other axis.
      const across = (b: Bounds) => (axis === "x" ? [b.z0, b.z1] : [b.x0, b.x1])
      for (const at of linesOf(moving, axis)) {
        const aligned = others.filter((b) => linesOf(b, axis).some((v) => Math.abs(v - at) < SAME))
        if (aligned.length === 0) continue
        const ends = [moving, ...aligned].flatMap(across)
        const from = Math.min(...ends)
        const to = Math.max(...ends)
        result.push(
          axis === "x"
            ? [
                [at, Y, from],
                [at, Y, to],
              ]
            : [
                [from, Y, at],
                [to, Y, at],
              ]
        )
      }
    }
    return result
  }, [objects, type, x, z, rotation, ignoreId])

  return (
    <>
      {guides.map((points, i) => (
        <Line key={i} points={points} color={COLOR} lineWidth={1.5} transparent opacity={0.9} />
      ))}
    </>
  )
}
