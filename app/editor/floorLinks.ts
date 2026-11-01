import { getFloorLink } from "./catalog"
import { getFloorId, type Floor } from "./floors"
import type { SceneObject } from "./types"

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
