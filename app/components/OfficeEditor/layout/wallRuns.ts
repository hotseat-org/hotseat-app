import type { Cell, WallCell } from "../types"
import { EDGE_ROTATION, SEG } from "./edges"
import { ALONG_Z } from "./rotation"

/** Wall edges between two nodes on one line: along an axis, or exactly diagonal. */
const straightEdges = (start: Cell, end: Cell): WallCell[] => {
  const edges: WallCell[] = []
  const deltaX = end.x - start.x
  const deltaZ = end.z - start.z
  if (deltaX !== 0 && Math.abs(Math.abs(deltaX) - Math.abs(deltaZ)) < 1e-9) {
    // Corner to corner across squares: from the node with the smaller x.
    const [from, to] = deltaX > 0 ? [start, end] : [end, start]
    const isRising = to.z > from.z
    const count = Math.round(Math.abs(deltaX) / SEG)
    for (let i = 0; i < count; i++)
      edges.push({
        x: from.x + (i + 0.5) * SEG,
        z: from.z + (isRising ? 1 : -1) * (i + 0.5) * SEG,
        rotation: EDGE_ROTATION[isRising ? "rising" : "falling"],
      })
    return edges
  }
  if (start.z === end.z) {
    const count = Math.round(Math.abs(end.x - start.x) / SEG)
    const minX = Math.min(start.x, end.x)
    for (let i = 0; i < count; i++)
      edges.push({ x: minX + (i + 0.5) * SEG, z: start.z, rotation: 0 })
  } else if (start.x === end.x) {
    const count = Math.round(Math.abs(end.z - start.z) / SEG)
    const minZ = Math.min(start.z, end.z)
    for (let i = 0; i < count; i++)
      edges.push({ x: start.x, z: minZ + (i + 0.5) * SEG, rotation: ALONG_Z })
  }
  return edges
}

/**
 * L-shaped run of wall *edges* between two grid nodes (Sims-style drag-draw).
 * Runs along the dominant axis first, turns the corner, then finishes along the
 * other axis. Each edge sits at its midpoint so perpendicular segments meet
 * flush at shared nodes. A straight drag (one axis) yields a straight run.
 */
export const wallRun = (start: Cell, end: Cell): WallCell[] => {
  // A single click (no drag) drops one segment heading east, for feedback.
  if (start.x === end.x && start.z === end.z)
    return [{ x: start.x + SEG / 2, z: start.z, rotation: 0 }]

  const deltaX = end.x - start.x
  const deltaZ = end.z - start.z
  // Dragged nearer 45° than either axis: a diagonal run, as long as the drag.
  const ratio =
    Math.min(Math.abs(deltaX), Math.abs(deltaZ)) / Math.max(Math.abs(deltaX), Math.abs(deltaZ))
  if (ratio > Math.tan(Math.PI / 8)) {
    const count = Math.max(1, Math.round((Math.abs(deltaX) + Math.abs(deltaZ)) / 2 / SEG))
    return straightEdges(start, {
      x: start.x + Math.sign(deltaX) * count * SEG,
      z: start.z + Math.sign(deltaZ) * count * SEG,
    })
  }
  const corner: Cell =
    Math.abs(deltaX) >= Math.abs(deltaZ) ? { x: end.x, z: start.z } : { x: start.x, z: end.z }

  const seen = new Set<string>()
  return [...straightEdges(start, corner), ...straightEdges(corner, end)].filter((edge) => {
    const key = `${edge.x},${edge.z},${Math.round(edge.rotation * 100)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The four walls of the rectangle between two grid nodes (Room tool). A drag
 * along one axis degenerates to a straight run, like the Wall tool.
 */
export const roomEdges = (start: Cell, end: Cell): WallCell[] => {
  if (start.x === end.x || start.z === end.z)
    return start.x === end.x && start.z === end.z ? [] : wallRun(start, end)
  const firstCorner = { x: end.x, z: start.z }
  const secondCorner = { x: start.x, z: end.z }
  return [
    ...straightEdges(start, firstCorner),
    ...straightEdges(firstCorner, end),
    ...straightEdges(secondCorner, end),
    ...straightEdges(start, secondCorner),
  ]
}
