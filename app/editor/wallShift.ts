import { nanoid } from "nanoid"
import {
  EDGE_ROTATION,
  SEG,
  edgeBlocked,
  edgeDirection,
  edgeKey,
  edgeNodes,
  mountWalls,
  unitEdges,
  composeFacePaint,
  getWallFacesFrom,
} from "./layout"
import { isEdgeType, isOpening, isWall, isWallMounted, type SceneObject } from "./types"

/** A press this close (m) to a wall's foot grabs the wall. */
const GRIP = 0.3

const nodeKey = (x: number, z: number) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`

/**
 * The straight wall (or glass wall) whose foot is under a floor point, for
 * dragging it — null when there's none near. Diagonal walls don't drag.
 */
export const findWallGrip = (objects: SceneObject[], x: number, z: number): string | null => {
  let best: { id: string; distance: number } | null = null
  for (const piece of objects) {
    if (!isWall(piece.type)) continue

    const direction = edgeDirection(piece.rotation)
    if (direction !== "x" && direction !== "z") continue

    const along = direction === "x" ? Math.abs(x - piece.x) : Math.abs(z - piece.z)
    const across = direction === "x" ? Math.abs(z - piece.z) : Math.abs(x - piece.x)
    if (along > SEG / 2 || across > GRIP) continue
    if (!best || across < best.distance) best = { id: piece.id, distance: across }
  }

  return best?.id ?? null
}

export interface WallShift {
  objects: SceneObject[]
  /** The wall run that moves (ids, as before the move). */
  runIds: string[]
}

/**
 * Drag a straight wall sideways by `offset` (m, whole grid steps): the run it
 * belongs to — straight on, up to the first corner or junction — moves, and
 * the walls meeting its ends stretch or shrink to stay joined, so rooms stay
 * closed. Doors and windows in the run, and what hangs on it, move with it.
 *
 * Null when it can't: it would run into another wall, through furniture,
 * through a door in a wall it shrinks, or take away wall something hangs on.
 */
export const composeWallShift = (
  objects: SceneObject[],
  gripId: string,
  offset: number
): WallShift | null => {
  const grip = objects.find((piece) => piece.id === gripId)
  if (!grip || offset === 0) return null

  const direction = edgeDirection(grip.rotation)
  if (direction !== "x" && direction !== "z") return null

  const across = direction === "x" ? "z" : "x"
  const crossDirection = direction === "x" ? "z" : "x"
  const sign = Math.sign(offset)
  const steps = Math.round(Math.abs(offset) / SEG)

  const edges = objects.filter((piece) => isEdgeType(piece.type))
  const atNode = new Map<string, SceneObject[]>()
  for (const edge of edges)
    for (const node of edgeNodes(edge)) {
      const key = nodeKey(node.x, node.z)
      atNode.set(key, [...(atNode.get(key) ?? []), edge])
    }
  const isOnLine = (edge: SceneObject) =>
    edgeDirection(edge.rotation) === direction && Math.abs(edge[across] - grip[across]) < 1e-6

  // The run: straight on from the grip while nothing else meets it.
  const run = new Set([grip])
  const ends: { x: number; z: number }[] = []
  for (const start of edgeNodes(grip)) {
    let node = start
    for (;;) {
      const others = (atNode.get(nodeKey(node.x, node.z)) ?? []).filter((edge) => !run.has(edge))
      const next = others.length === 1 && isOnLine(others[0]) ? others[0] : null
      if (!next) {
        ends.push(node)
        break
      }

      run.add(next)
      const [startNode, endNode] = edgeNodes(next)
      node = nodeKey(startNode.x, startNode.z) === nodeKey(node.x, node.z) ? endNode : startNode
    }
  }

  const byUnit = new Map<string, SceneObject>()
  for (const edge of edges) for (const unit of unitEdges(edge)) byUnit.set(edgeKey(unit), edge)
  const crossRotation = EDGE_ROTATION[crossDirection]
  /** The unit edges between an end and where it moves to. */
  const spanOf = (end: { x: number; z: number }) =>
    Array.from({ length: steps }, (_, index) => {
      const at = end[across] + sign * (index + 0.5) * SEG

      return across === "z"
        ? { x: end.x, z: at, rotation: crossRotation }
        : { x: at, z: end.z, rotation: crossRotation }
    })

  const removed = new Set<SceneObject>()
  const added: SceneObject[] = []
  const runType = grip.type
  for (const end of ends) {
    const attached = (atNode.get(nodeKey(end.x, end.z)) ?? []).filter((edge) => !run.has(edge))
    if (attached.length === 0) continue // a free end

    const span = spanOf(end)
    const first = byUnit.get(edgeKey(span[0]))
    const rest = attached.filter((edge) => edge !== first)
    if (rest.length > 0) {
      // Something else still meets the old corner: a wall joins it to the new one.
      const template = first ?? rest.find((edge) => isWall(edge.type)) ?? grip
      for (const unit of span) {
        if (byUnit.has(edgeKey(unit))) continue

        added.push({
          id: nanoid(8),
          type: isWall(template.type) ? template.type : runType,
          // Its paint, each face seen the new wall's way round.
          ...composeFacePaint(getWallFacesFrom(template, unit)),
          ...unit,
        })
      }
    } else {
      // Only the wall ahead meets it: that wall shrinks — all of it plain wall,
      // with nothing else joining it on the way.
      for (const [index, unit] of span.entries()) {
        const wall = byUnit.get(edgeKey(unit))
        if (!wall || isOpening(wall.type)) return null

        removed.add(wall)
        const node =
          across === "z"
            ? { x: end.x, z: end.z + sign * index * SEG }
            : { x: end.x + sign * index * SEG, z: end.z }
        const joining = (atNode.get(nodeKey(node.x, node.z)) ?? []).filter(
          (edge) => !run.has(edge) && edgeDirection(edge.rotation) !== crossDirection
        )
        if (index > 0 && joining.length > 0) return null
      }
    }
  }

  const runIds = new Set([...run].map((piece) => piece.id))
  const removedIds = new Set([...removed].map((piece) => piece.id))
  // What hangs on the run moves with it; nothing may hang on wall that goes.
  const shiftedMounts = new Set<string>()
  for (const piece of objects) {
    if (!isWallMounted(piece.type)) continue

    const walls = mountWalls(objects, piece.type, piece.x, piece.z, piece.rotation) ?? []
    if (walls.some((id) => removedIds.has(id))) return null
    if (walls.some((id) => runIds.has(id))) shiftedMounts.add(piece.id)
  }

  const shift = (piece: SceneObject) => ({ ...piece, [across]: piece[across] + sign * steps * SEG })
  const moved = [...run].map(shift)
  const kept = objects.filter((piece) => !runIds.has(piece.id) && !removedIds.has(piece.id))
  // The moved run may not land on another wall…
  const taken = new Set(
    kept
      .filter((piece) => isEdgeType(piece.type))
      .flatMap(unitEdges)
      .map(edgeKey)
  )
  const fresh = [...moved, ...added].flatMap(unitEdges)
  if (fresh.some((unit) => taken.has(edgeKey(unit)))) return null

  // …nor through furniture.
  const furniture = kept.filter((piece) => !isEdgeType(piece.type) && !shiftedMounts.has(piece.id))
  if (fresh.some((unit) => edgeBlocked(furniture, unit))) return null

  const next = [
    ...kept.map((piece) => (shiftedMounts.has(piece.id) ? shift(piece) : piece)),
    ...moved,
    ...added,
  ]

  return { objects: next, runIds: [...runIds] }
}
