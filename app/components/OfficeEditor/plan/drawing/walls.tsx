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
  for (const segment of objects) {
    if (!isWall(segment.type)) continue
    const glass = !!getEdge(segment.type)?.isSeeThrough
    // Each face's paint, seen the run's way round (its line's +Z / +X side first).
    const faces = getWallFacesFrom(segment, {
      rotation: EDGE_ROTATION[edgeDirection(segment.rotation)],
    })
    const [color, back] = glass ? [WINDOW_GLASS, WINDOW_GLASS] : faces.map((face) => face ?? wall)
    if (isDiagonalEdge(segment.rotation)) {
      // Diagonal: runs on the lines where x − z (rising) or x + z (falling) holds.
      const isRising = edgeDirection(segment.rotation) === "rising"
      const key = `${isRising}|${isRising ? segment.x - segment.z : segment.x + segment.z}|${glass}|${color}|${back}`
      const run = diagonalRuns.get(key) ?? {
        rotation: EDGE_ROTATION[edgeDirection(segment.rotation)],
        at: [],
        color,
        back,
        glass,
      }
      run.at.push(segment)
      diagonalRuns.set(key, run)
      continue
    }
    const alongX = runsAlongX(segment.rotation)
    const fixed = alongX ? segment.z : segment.x
    const key = `${alongX}|${fixed}|${glass}|${color}|${back}`
    const run = runs.get(key) ?? { alongX, fixed, at: [], color, back, glass }
    run.at.push(alongX ? segment.x : segment.z)
    runs.set(key, run)
  }

  for (const run of runs.values()) {
    run.at.sort((first, second) => first - second)
    let start = run.at[0]
    let prev = run.at[0]
    const flush = () =>
      facedWallPiece(
        run.alongX,
        run.fixed,
        start - SEG / 2,
        prev + SEG / 2,
        [run.color, run.back],
        {
          // Glass partitions: a slimmer, see-through line.
          opacity: run.glass ? 0.8 : 1,
          across: run.glass ? HALF_WALL * 0.5 : HALF_WALL,
        }
      )
    for (const position of run.at.slice(1)) {
      if (Math.abs(position - prev - SEG) > 1e-6) {
        flush()
        start = position
      }
      prev = position
    }
    flush()
  }

  for (const run of diagonalRuns.values()) {
    run.at.sort((first, second) => first.x - second.x)
    let start = run.at[0]
    let prev = run.at[0]
    const flush = () => {
      const [startNode] = edgeNodes(start)
      const [, endNode] = edgeNodes(prev)
      facedDiagonalWallPiece(startNode, endNode, run.rotation, [run.color, run.back], {
        opacity: run.glass ? 0.8 : 1,
        across: run.glass ? HALF_WALL * 0.5 : HALF_WALL,
      })
    }
    for (const segment of run.at.slice(1)) {
      if (Math.abs(segment.x - prev.x - SEG) > 1e-6) {
        flush()
        start = segment
      }
      prev = segment
    }
    flush()
  }

  // Corners and junctions: each quarter in the paint of the wall faces looking
  // into it (as the 3D posts) — over the runs' ends, which overlap there.
  for (const node of wallJointNodes(objects)) {
    const quarters = wallColors.joints.get(`${node.x},${node.z}`)
    if (!quarters || new Set(quarters).size === 1) continue
    quarters.forEach((color, quarter) => {
      const x0 = quarter % 2 ? node.x : node.x - HALF_WALL
      const z0 = quarter < 2 ? node.z - HALF_WALL : node.z
      push(
        { x0, x1: x0 + HALF_WALL, z0, z1: z0 + HALF_WALL, y0: 0, y1: WALL.height },
        <rect x={x0} y={z0} width={HALF_WALL} height={HALF_WALL} fill={color ?? wall} />
      )
    })
  }
}
