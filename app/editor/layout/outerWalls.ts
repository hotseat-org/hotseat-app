import { getEdge } from "../catalog"
import { GLASS_HOST, type SceneObject } from "../types"
import { getCellKey } from "./cells"
import { SEG, edgeDirection, unitEdges } from "./edges"
import { enclosedRegions, isInRegion, type FloorCell } from "./rooms"
import { composeWallColors } from "./wallColors"
import { composeFacePaint } from "./wallFaces"

/** How far to each side of an edge its two sides are looked at (m). */
const SIDE_OFFSET = SEG * 0.1

/** One step off an edge, square to it (a unit vector, scaled by SIDE_OFFSET). */
const getSideStep = (rotation: number): [number, number] => {
  const diagonalStep = SIDE_OFFSET * Math.SQRT1_2

  switch (edgeDirection(rotation)) {
    case "x":
      return [0, SIDE_OFFSET]
    case "z":
      return [SIDE_OFFSET, 0]
    case "rising":
      return [diagonalStep, -diagonalStep]
    case "falling":
      return [diagonalStep, diagonalStep]
  }
}

/** Every room's floor in one lookup — a square split between two rooms has both rooms' parts. */
const composeInterior = (objects: SceneObject[]) => {
  const interior = new Map<string, FloorCell>()
  for (const cell of enclosedRegions(objects).flat()) {
    const key = getCellKey(cell.x, cell.z)
    const known = interior.get(key)
    if (!known) {
      interior.set(key, cell)
      continue
    }
    // Whole already; else the two rooms' parts of the square, together.
    if (known.parts === undefined) continue

    interior.set(
      key,
      cell.parts === undefined ? cell : { ...known, parts: known.parts | cell.parts }
    )
  }

  return interior
}

/**
 * The building's outer walls: every wall, window and door with a room on one
 * side and the outside on the other — what a floor built on top starts from
 * (no inner walls, no furniture). The doors are filled in with wall, painted
 * like the wall round them: up there, they'd open onto thin air. New pieces,
 * without ids (the caller gives them their floor).
 */
export const composeOuterWalls = (objects: SceneObject[]): Omit<SceneObject, "id">[] => {
  const interior = composeInterior(objects)
  const isOuter = (edge: SceneObject) => {
    const [stepX, stepZ] = getSideStep(edge.rotation)
    const isInsideAhead = isInRegion(interior, edge.x + stepX, edge.z + stepZ)
    const isInsideBehind = isInRegion(interior, edge.x - stepX, edge.z - stepZ)

    return isInsideAhead !== isInsideBehind
  }
  const outerEdges = objects.filter((object) => getEdge(object.type)?.encloses && isOuter(object))
  const openingPaints = composeWallColors(objects).openings

  return outerEdges.flatMap(({ id, ...edge }) => {
    if (!getEdge(edge.type)?.isPassable) return [edge]

    const isInGlass = edge.model === GLASS_HOST
    const faces = isInGlass ? undefined : openingPaints.get(id)
    const paint = faces ? composeFacePaint(faces) : {}

    return unitEdges({ id, ...edge }).map((unit) => ({
      type: isInGlass ? ("glassWall" as const) : ("wall" as const),
      ...unit,
      ...paint,
    }))
  })
}
