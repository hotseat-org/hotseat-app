import { getEdge, getFloorLink, getItem } from "./catalog"
import { edgeDirection, unitEdges } from "./layout"
import { getFloorId, type Floor } from "./floors"
import { GRID, type SceneObject } from "./types"

/** The ways between floors a floor sees, apart from its own pieces. */
export interface FloorLinks {
  /** Stairs up from the floor below: they come up through this floor (an opening, a guard rail). */
  arrivingStairs: SceneObject[]
  /** Lifts placed on other floors: their shafts pass through this one too. */
  passingLifts: SceneObject[]
}

/** Whether a piece joins floors (stairs, a lift). */
export const isFloorLink = (piece: Pick<SceneObject, "type">) => !!getFloorLink(piece.type)

/**
 * The ways between floors that reach a floor from others: stairs from the
 * floor right below, lifts from any floor. `pieces`: every floor's.
 */
export const getFloorLinks = (
  pieces: SceneObject[],
  floors: Floor[],
  floorId: string
): FloorLinks => {
  const level = floors.findIndex((floor) => floor.id === floorId)
  const below = floors[level - 1]?.id
  const arrivingStairs: SceneObject[] = []
  const passingLifts: SceneObject[] = []
  for (const piece of pieces) {
    const link = getFloorLink(piece.type)
    if (!link) continue

    const pieceFloor = getFloorId(piece, floors)
    if (link === "above" && pieceFloor === below) arrivingStairs.push(piece)
    if (link === "all" && pieceFloor !== floorId) passingLifts.push(piece)
  }

  return { arrivingStairs, passingLifts }
}

/**
 * What stands on a floor from other floors and keeps it clear: the openings
 * of stairs coming up, and lift shafts — nothing may be placed there.
 */
export const getFloorBlockers = (pieces: SceneObject[], floors: Floor[], floorId: string) => {
  const { arrivingStairs, passingLifts } = getFloorLinks(pieces, floors, floorId)

  return [...arrivingStairs, ...passingLifts]
}

/** Which of stairs' sides run along a wall (their own frame: left −X, right +X, foot +Z). */
export interface StairsSides {
  left: boolean
  right: boolean
  foot: boolean
}

/** How near a wall's line must be to a side to stand along it (m). */
const SIDE_SLACK = 0.12

/**
 * Which sides of stairs run along a wall among `pieces` (a floor's): half or
 * more of a side with wall beside it (a door breaks it) — no rail is needed
 * there. Stairs turned diagonally have none.
 */
export const getStairsWalledSides = (stairs: SceneObject, pieces: SceneObject[]): StairsSides => {
  const [cellsX, cellsZ] = getItem(stairs.type).footprint
  const halfWidth = (cellsX * GRID) / 2
  const halfLength = (cellsZ * GRID) / 2
  const cos = Math.cos(stairs.rotation)
  const sin = Math.sin(stairs.rotation)
  const toLocal = (x: number, z: number) => {
    const deltaX = x - stairs.x
    const deltaZ = z - stairs.z

    return { x: deltaX * cos - deltaZ * sin, z: deltaX * sin + deltaZ * cos }
  }
  /** The side a wall's unit edge runs along, if any. */
  const getSide = (unit: { x: number; z: number; rotation: number }) => {
    const direction = edgeDirection(unit.rotation)
    if (direction !== "x" && direction !== "z") return null

    const centre = toLocal(unit.x, unit.z)
    // The edge's line in the stairs' frame: along their length (local Z), or across it.
    const along = toLocal(
      stairs.x + (direction === "x" ? 1 : 0),
      stairs.z + (direction === "z" ? 1 : 0)
    )
    const isAlongLength = Math.abs(along.x) < 0.1
    if (isAlongLength && Math.abs(centre.z) < halfLength) {
      if (Math.abs(centre.x + halfWidth) < SIDE_SLACK) return "left"
      if (Math.abs(centre.x - halfWidth) < SIDE_SLACK) return "right"
    }

    const isAcrossFoot =
      !isAlongLength &&
      Math.abs(centre.x) < halfWidth &&
      Math.abs(centre.z - halfLength) < SIDE_SLACK

    return isAcrossFoot ? "foot" : null
  }
  const covered = { left: 0, right: 0, foot: 0 }
  for (const piece of pieces) {
    const edge = getEdge(piece.type)
    if (!edge || edge.isPassable) continue

    for (const unit of unitEdges(piece)) {
      const side = getSide(unit)
      if (side) covered[side] += GRID
    }
  }

  return {
    left: covered.left >= halfLength,
    right: covered.right >= halfLength,
    foot: covered.foot >= halfWidth,
  }
}
