import { useEffect, useMemo } from "react"
import { BufferGeometry, Float32BufferAttribute } from "three"
import { footprintCells, isDiagonal } from "../layout"
import { GRID, isEdgeType, isMarker, isOverhead, type ObjectType, type SceneObject } from "../types"

/** Only pieces this near (m) count — a row across the room, not the whole office. */
const REACH = 14
/** Just above the floor and placement highlight. */
const HEIGHT = 0.03
/** Equal to within this (m): positions are on the grid, so equal means equal. */
const SAME = 1e-4
const COLOR = "#ff3d8b"

interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  /** Turned off the axes: only its centre lines up, not its edges. */
  isTurned: boolean
}

const boundsOf = ({
  type,
  rotation,
  x,
  z,
}: {
  type: ObjectType
  rotation: number
  x: number
  z: number
}): Bounds => {
  const [cellsX, cellsZ] = footprintCells(type, rotation)

  return {
    minX: x - (cellsX * GRID) / 2,
    maxX: x + (cellsX * GRID) / 2,
    minZ: z - (cellsZ * GRID) / 2,
    maxZ: z + (cellsZ * GRID) / 2,
    isTurned: isDiagonal(rotation),
  }
}

/** The lines a piece offers along one axis: its two edges and its centre. */
const linesOf = (bounds: Bounds, axis: "x" | "z") => {
  const [low, high] = axis === "x" ? [bounds.minX, bounds.maxX] : [bounds.minZ, bounds.maxZ]

  return bounds.isTurned ? [(low + high) / 2] : [low, (low + high) / 2, high]
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
    const moving = boundsOf({ type, rotation, x, z })
    const others = objects
      .filter(
        (object) =>
          object.id !== ignoreId &&
          !isEdgeType(object.type) &&
          !isMarker(object.type) &&
          !isOverhead(object.type) &&
          Math.hypot(object.x - x, object.z - z) <= REACH
      )
      .map((object) => boundsOf(object))
    const result: [number, number, number][][] = []
    for (const axis of ["x", "z"] as const) {
      // A line at a fixed x (or z), running along the other axis.
      const across = (bounds: Bounds) =>
        axis === "x" ? [bounds.minZ, bounds.maxZ] : [bounds.minX, bounds.maxX]
      for (const at of linesOf(moving, axis)) {
        const aligned = others.filter((other) =>
          linesOf(other, axis).some((value) => Math.abs(value - at) < SAME)
        )
        if (aligned.length === 0) continue

        const ends = [moving, ...aligned].flatMap(across)
        const from = Math.min(...ends)
        const to = Math.max(...ends)
        result.push(
          axis === "x"
            ? [
                [at, HEIGHT, from],
                [at, HEIGHT, to],
              ]
            : [
                [from, HEIGHT, at],
                [to, HEIGHT, at],
              ]
        )
      }
    }

    return result
  }, [objects, type, x, z, rotation, ignoreId])

  // Every guide in one draw: a pair of points each.
  const geometry = useMemo(() => {
    const positions = guides.flatMap((points) => points.flat())

    return new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3))
  }, [guides])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (guides.length === 0) return null

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={COLOR} transparent opacity={0.9} />
    </lineSegments>
  )
}
