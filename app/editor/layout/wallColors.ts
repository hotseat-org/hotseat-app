import { isEdgeType, isOpening, type SceneObject } from "../types"
import { edgeKey, edgeNodes, edgeStep, isGlassEdge, isSolidWall, unitEdges } from "./edges"
import { getWallFaces, getWallFacesFrom, hasOwnPaint, type WallFaces } from "./wallFaces"

/** A joint post's four quarters: (−x, −z), (+x, −z), (−x, +z), (+x, +z). */
export type PostQuarters = [
  string | undefined,
  string | undefined,
  string | undefined,
  string | undefined,
]

/**
 * The paint that the wall parts of openings and joints take from the walls
 * round them (undefined = the theme's wall colour):
 * - a window (its sill and head) each face the
 *   colour of the nearest walls' along its line, through other openings — a
 *   painted side wins; seen from the opening's way round;
 * - a joint post (a corner, a T), in quarters: each the colour most of the
 *   wall faces looking into it have, a painted one winning a tie. Keyed "x,z".
 */
export const composeWallColors = (objects: SceneObject[]) => {
  const owner = new Map<string, SceneObject>()
  for (const object of objects)
    if (isEdgeType(object.type))
      for (const unit of unitEdges(object)) owner.set(edgeKey(unit), object)

  const openings = new Map<string, WallFaces>()
  for (const opening of objects) {
    if (!isOpening(opening.type) || isGlassEdge(opening)) continue
    const [stepX, stepZ] = edgeStep(opening.rotation)
    const [first, last] = unitEdges(opening)
    const sides = (
      [
        [first, -1],
        [last, 1],
      ] as const
    ).flatMap(([unit, direction]) => {
      for (
        let x = unit.x + direction * stepX, z = unit.z + direction * stepZ;
        ;
        x += direction * stepX, z += direction * stepZ
      ) {
        const wall = owner.get(edgeKey({ x, z, rotation: opening.rotation }))
        if (!wall || isGlassEdge(wall)) return []
        if (isSolidWall(wall)) return [getWallFacesFrom(wall, opening)]
      }
    })
    openings.set(
      opening.id,
      hasOwnPaint(opening)
        ? [opening.colorFront, opening.colorBack]
        : [sides.find(([front]) => front)?.[0], sides.find(([, back]) => back)?.[1]]
    )
  }

  /** Each quarter of each node: how many faces of each colour look into it. */
  const counts = new Map<string, Map<string | undefined, number>[]>()
  for (const edge of objects) {
    if (!isEdgeType(edge.type) || isGlassEdge(edge)) continue
    const [front, back] = isOpening(edge.type)
      ? (openings.get(edge.id) as WallFaces)
      : getWallFaces(edge)
    const normal = { x: Math.sin(edge.rotation), z: Math.cos(edge.rotation) }
    for (const node of edgeNodes(edge)) {
      const key = `${node.x},${node.z}`
      const quarters =
        counts.get(key) ?? [0, 1, 2, 3].map(() => new Map<string | undefined, number>())
      counts.set(key, quarters)
      // Towards the edge from the node, then off it to each face's side: the
      // quarter (or, a diagonal, the two) that face looks into.
      const toward = { x: Math.sign(edge.x - node.x), z: Math.sign(edge.z - node.z) }
      for (const [color, side] of [
        [front, 1],
        [back, -1],
      ] as const) {
        const quarterX = Math.sign(toward.x + Math.round(normal.x * side))
        const quarterZ = Math.sign(toward.z + Math.round(normal.z * side))
        for (const indexX of quarterX === 0 ? [0, 1] : [quarterX > 0 ? 1 : 0])
          for (const indexZ of quarterZ === 0 ? [0, 1] : [quarterZ > 0 ? 1 : 0]) {
            const tally = quarters[indexX + indexZ * 2]
            tally.set(color, (tally.get(color) ?? 0) + 1)
          }
      }
    }
  }
  /** The most common colour, a painted one winning a tie. */
  const winnerOf = (tally: Map<string | undefined, number>) =>
    [...tally].sort(
      ([firstColor, firstCount], [secondColor, secondCount]) =>
        secondCount - firstCount || (firstColor ? 0 : 1) - (secondColor ? 0 : 1)
    )[0]?.[0]
  const joints = new Map<string, PostQuarters>()
  for (const [key, quarters] of counts) {
    // A quarter no face looks into (an outer corner, behind both walls'
    // ends): the colour of the two quarters beside it — the faces either side
    // of the corner — then of the whole post.
    const merge = (tallies: Map<string | undefined, number>[]) => {
      const sum = new Map<string | undefined, number>()
      for (const tally of tallies)
        for (const [color, count] of tally) sum.set(color, (sum.get(color) ?? 0) + count)
      return sum
    }
    const overall = winnerOf(merge(quarters))
    joints.set(
      key,
      quarters.map((tally, quarter) => {
        if (tally.size) return winnerOf(tally)
        // Beside it: across x (quarter ^ 1) and across z (quarter ^ 2).
        const beside = merge([quarters[quarter ^ 1], quarters[quarter ^ 2]])
        return beside.size ? winnerOf(beside) : overall
      }) as PostQuarters
    )
  }
  return { openings, joints }
}
