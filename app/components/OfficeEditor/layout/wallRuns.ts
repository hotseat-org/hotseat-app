import type { Cell, WallCell } from "../types"
import { EDGE_ROTATION, SEG } from "./edges"
import { ALONG_Z } from "./rotation"

/** Wall edges between two nodes on one line: along an axis, or exactly diagonal. */
const straightEdges = (a: Cell, b: Cell): WallCell[] => {
  const edges: WallCell[] = []
  const dx = b.x - a.x
  const dz = b.z - a.z
  if (dx !== 0 && Math.abs(Math.abs(dx) - Math.abs(dz)) < 1e-9) {
    // Corner to corner across squares: from the node with the smaller x.
    const [from, to] = dx > 0 ? [a, b] : [b, a]
    const isRising = to.z > from.z
    const n = Math.round(Math.abs(dx) / SEG)
    for (let i = 0; i < n; i++)
      edges.push({
        x: from.x + (i + 0.5) * SEG,
        z: from.z + (isRising ? 1 : -1) * (i + 0.5) * SEG,
        rotation: EDGE_ROTATION[isRising ? "rising" : "falling"],
      })
    return edges
  }
  if (a.z === b.z) {
    const n = Math.round(Math.abs(b.x - a.x) / SEG)
    const lo = Math.min(a.x, b.x)
    for (let i = 0; i < n; i++) edges.push({ x: lo + (i + 0.5) * SEG, z: a.z, rotation: 0 })
  } else if (a.x === b.x) {
    const n = Math.round(Math.abs(b.z - a.z) / SEG)
    const lo = Math.min(a.z, b.z)
    for (let i = 0; i < n; i++) edges.push({ x: a.x, z: lo + (i + 0.5) * SEG, rotation: ALONG_Z })
  }
  return edges
}

/**
 * L-shaped run of wall *edges* between two grid nodes (Sims-style drag-draw).
 * Runs along the dominant axis first, turns the corner, then finishes along the
 * other axis. Each edge sits at its midpoint so perpendicular segments meet
 * flush at shared nodes. A straight drag (one axis) yields a straight run.
 */
export const wallRun = (a: Cell, b: Cell): WallCell[] => {
  // A single click (no drag) drops one segment heading east, for feedback.
  if (a.x === b.x && a.z === b.z) return [{ x: a.x + SEG / 2, z: a.z, rotation: 0 }]

  const dx = b.x - a.x
  const dz = b.z - a.z
  // Dragged nearer 45° than either axis: a diagonal run, as long as the drag.
  const ratio = Math.min(Math.abs(dx), Math.abs(dz)) / Math.max(Math.abs(dx), Math.abs(dz))
  if (ratio > Math.tan(Math.PI / 8)) {
    const n = Math.max(1, Math.round((Math.abs(dx) + Math.abs(dz)) / 2 / SEG))
    return straightEdges(a, { x: a.x + Math.sign(dx) * n * SEG, z: a.z + Math.sign(dz) * n * SEG })
  }
  const corner: Cell = Math.abs(dx) >= Math.abs(dz) ? { x: b.x, z: a.z } : { x: a.x, z: b.z }

  const seen = new Set<string>()
  return [...straightEdges(a, corner), ...straightEdges(corner, b)].filter((e) => {
    const k = `${e.x},${e.z},${Math.round(e.rotation * 100)}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * The four walls of the rectangle between two grid nodes (Room tool). A drag
 * along one axis degenerates to a straight run, like the Wall tool.
 */
export const roomEdges = (a: Cell, b: Cell): WallCell[] => {
  if (a.x === b.x || a.z === b.z) return a.x === b.x && a.z === b.z ? [] : wallRun(a, b)
  const c1 = { x: b.x, z: a.z }
  const c2 = { x: a.x, z: b.z }
  return [
    ...straightEdges(a, c1),
    ...straightEdges(c1, b),
    ...straightEdges(c2, b),
    ...straightEdges(a, c2),
  ]
}
