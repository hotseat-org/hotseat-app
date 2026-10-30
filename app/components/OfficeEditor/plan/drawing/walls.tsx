import {
  EDGE_ROTATION,
  SEG,
  composeWallColors,
  edgeDirection,
  edgeNodes,
  getWallFacesFrom,
  isDiagonalEdge,
  runsAlongX,
  wallJointNodes,
} from "../../layout"
import { WALL } from "../../objects/dimensions"
import { isWall, type SceneObject } from "../../types"
import { WINDOW_GLASS } from "../kits"
import { getEdge } from "../../catalog/items"
import { HALF_WALL, type Push, type WallPieces } from "./wallPieces"

/**
 * Plain and glass walls, merged into straight runs of the same colour — one
 * piece per run, so no seams between half-metre segments — then the corner
 * and junction posts over the runs' ends.
 */
export const drawWalls = (
  objects: SceneObject[],
  /** The theme's wall colour (unpainted faces). */
  wall: string,
  wallColors: ReturnType<typeof composeWallColors>,
  { facedWallPiece, facedDiagonalWallPiece }: WallPieces,
  push: Push
) => {
  const runs = new Map<
    string,
    { alongX: boolean; fixed: number; at: number[]; color: string; back: string; glass: boolean }
  >()
  const diagonalRuns = new Map<
    string,
    { rotation: number; at: SceneObject[]; color: string; back: string; glass: boolean }
  >()
  for (const o of objects) {
    if (!isWall(o.type)) continue
    const glass = !!getEdge(o.type)?.isSeeThrough
    // Each face's paint, seen the run's way round (its line's +Z / +X side first).
    const faces = getWallFacesFrom(o, { rotation: EDGE_ROTATION[edgeDirection(o.rotation)] })
    const [color, back] = glass ? [WINDOW_GLASS, WINDOW_GLASS] : faces.map((c) => c ?? wall)
    if (isDiagonalEdge(o.rotation)) {
      // Diagonal: runs on the lines where x − z (rising) or x + z (falling) holds.
      const isRising = edgeDirection(o.rotation) === "rising"
      const key = `${isRising}|${isRising ? o.x - o.z : o.x + o.z}|${glass}|${color}|${back}`
      const run = diagonalRuns.get(key) ?? {
        rotation: EDGE_ROTATION[edgeDirection(o.rotation)],
        at: [],
        color,
        back,
        glass,
      }
      run.at.push(o)
      diagonalRuns.set(key, run)
      continue
    }
    const alongX = runsAlongX(o.rotation)
    const fixed = alongX ? o.z : o.x
    const key = `${alongX}|${fixed}|${glass}|${color}|${back}`
    const run = runs.get(key) ?? { alongX, fixed, at: [], color, back, glass }
    run.at.push(alongX ? o.x : o.z)
    runs.set(key, run)
  }

  for (const r of runs.values()) {
    r.at.sort((p, q) => p - q)
    let start = r.at[0]
    let prev = r.at[0]
    const flush = () =>
      facedWallPiece(r.alongX, r.fixed, start - SEG / 2, prev + SEG / 2, [r.color, r.back], {
        // Glass partitions: a slimmer, see-through line.
        opacity: r.glass ? 0.8 : 1,
        across: r.glass ? HALF_WALL * 0.5 : HALF_WALL,
      })
    for (const v of r.at.slice(1)) {
      if (Math.abs(v - prev - SEG) > 1e-6) {
        flush()
        start = v
      }
      prev = v
    }
    flush()
  }

  for (const r of diagonalRuns.values()) {
    r.at.sort((p, q) => p.x - q.x)
    let start = r.at[0]
    let prev = r.at[0]
    const flush = () => {
      const [a] = edgeNodes(start)
      const [, b] = edgeNodes(prev)
      facedDiagonalWallPiece(a, b, r.rotation, [r.color, r.back], {
        opacity: r.glass ? 0.8 : 1,
        across: r.glass ? HALF_WALL * 0.5 : HALF_WALL,
      })
    }
    for (const o of r.at.slice(1)) {
      if (Math.abs(o.x - prev.x - SEG) > 1e-6) {
        flush()
        start = o
      }
      prev = o
    }
    flush()
  }

  // Corners and junctions: each quarter in the paint of the wall faces looking
  // into it (as the 3D posts) — over the runs' ends, which overlap there.
  for (const n of wallJointNodes(objects)) {
    const quarters = wallColors.joints.get(`${n.x},${n.z}`)
    if (!quarters || new Set(quarters).size === 1) continue
    quarters.forEach((color, q) => {
      const x0 = q % 2 ? n.x : n.x - HALF_WALL
      const z0 = q < 2 ? n.z - HALF_WALL : n.z
      push(
        { x0, x1: x0 + HALF_WALL, z0, z1: z0 + HALF_WALL, y0: 0, y1: WALL.height },
        <rect x={x0} y={z0} width={HALF_WALL} height={HALF_WALL} fill={color ?? wall} />
      )
    })
  }
}
