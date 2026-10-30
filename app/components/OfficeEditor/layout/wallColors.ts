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
  for (const o of objects)
    if (isEdgeType(o.type)) for (const e of unitEdges(o)) owner.set(edgeKey(e), o)

  const openings = new Map<string, WallFaces>()
  for (const o of objects) {
    if (!isOpening(o.type) || isGlassEdge(o)) continue
    const [sx, sz] = edgeStep(o.rotation)
    const [first, last] = unitEdges(o)
    const sides = (
      [
        [first, -1],
        [last, 1],
      ] as const
    ).flatMap(([e, dir]) => {
      for (let x = e.x + dir * sx, z = e.z + dir * sz; ; x += dir * sx, z += dir * sz) {
        const w = owner.get(edgeKey({ x, z, rotation: o.rotation }))
        if (!w || isGlassEdge(w)) return []
        if (isSolidWall(w)) return [getWallFacesFrom(w, o)]
      }
    })
    openings.set(
      o.id,
      hasOwnPaint(o)
        ? [o.colorFront, o.colorBack]
        : [sides.find(([front]) => front)?.[0], sides.find(([, back]) => back)?.[1]]
    )
  }

  /** Each quarter of each node: how many faces of each colour look into it. */
  const counts = new Map<string, Map<string | undefined, number>[]>()
  for (const o of objects) {
    if (!isEdgeType(o.type) || isGlassEdge(o)) continue
    const [front, back] = isOpening(o.type) ? (openings.get(o.id) as WallFaces) : getWallFaces(o)
    const normal = { x: Math.sin(o.rotation), z: Math.cos(o.rotation) }
    for (const n of edgeNodes(o)) {
      const key = `${n.x},${n.z}`
      const quarters =
        counts.get(key) ?? [0, 1, 2, 3].map(() => new Map<string | undefined, number>())
      counts.set(key, quarters)
      // Towards the edge from the node, then off it to each face's side: the
      // quarter (or, a diagonal, the two) that face looks into.
      const toward = { x: Math.sign(o.x - n.x), z: Math.sign(o.z - n.z) }
      for (const [color, side] of [
        [front, 1],
        [back, -1],
      ] as const) {
        const qx = Math.sign(toward.x + Math.round(normal.x * side))
        const qz = Math.sign(toward.z + Math.round(normal.z * side))
        for (const ix of qx === 0 ? [0, 1] : [qx > 0 ? 1 : 0])
          for (const iz of qz === 0 ? [0, 1] : [qz > 0 ? 1 : 0]) {
            const tally = quarters[ix + iz * 2]
            tally.set(color, (tally.get(color) ?? 0) + 1)
          }
      }
    }
  }
  /** The most common colour, a painted one winning a tie. */
  const winnerOf = (tally: Map<string | undefined, number>) =>
    [...tally].sort(([a, n], [b, m]) => m - n || (a ? 0 : 1) - (b ? 0 : 1))[0]?.[0]
  const joints = new Map<string, PostQuarters>()
  for (const [key, quarters] of counts) {
    // A quarter no face looks into (an outer corner, behind both walls'
    // ends): the colour of the two quarters beside it — the faces either side
    // of the corner — then of the whole post.
    const merge = (tallies: Map<string | undefined, number>[]) => {
      const sum = new Map<string | undefined, number>()
      for (const tally of tallies)
        for (const [color, n] of tally) sum.set(color, (sum.get(color) ?? 0) + n)
      return sum
    }
    const overall = winnerOf(merge(quarters))
    joints.set(
      key,
      quarters.map((tally, q) => {
        if (tally.size) return winnerOf(tally)
        // Beside it: across x (q ^ 1) and across z (q ^ 2).
        const beside = merge([quarters[q ^ 1], quarters[q ^ 2]])
        return beside.size ? winnerOf(beside) : overall
      }) as PostQuarters
    )
  }
  return { openings, joints }
}
