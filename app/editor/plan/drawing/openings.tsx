import {
  EDGE_ROTATION,
  composeWallColors,
  edgeDirection,
  edgeNodes,
  isDiagonalEdge,
  runsAlongX,
} from "../../layout"
import { PALETTE } from "../../palette"
import type { SceneObject } from "../../types"
import { WINDOW_GLASS } from "../sketch"
import { shade } from "../shapes"
import { isOpening } from "../../types"
import { HALF_WALL, type Push, type WallPieces } from "./wallPieces"

/** A door's jambs, each this wide (m). */
const POST = 0.1
/** A glass door's slim metal frame (a door's is wooden). */
const GLASS_DOOR_FRAME = "#5b6577"

/**
 * Windows: the wall with a pane of glass along its middle. Doors: the gap
 * between two jambs, the leaf standing open and its swing — a plan's door.
 * A window in its wall's paint (or its own); a door in its wooden frame.
 */
export const drawOpenings = (
  objects: SceneObject[],
  /** The theme's wall colour (unpainted faces). */
  wall: string,
  wallColors: ReturnType<typeof composeWallColors>,
  { wallPiece, diagonalWallPiece, facedWallPiece, facedDiagonalWallPiece }: WallPieces,
  push: Push
) => {
  /** An opening's wall faces, its own way round (themed where unpainted). */
  const facesOf = (opening: SceneObject): [string, string] => {
    const [front, back] = wallColors.openings.get(opening.id) ?? [undefined, undefined]

    return [front ?? wall, back ?? wall]
  }
  /** Built turned about from its line's way (the faces swap). */
  const isTurnedFromLine = (opening: SceneObject) =>
    Math.cos(opening.rotation - EDGE_ROTATION[edgeDirection(opening.rotation)]) < 0
  /** An opening's faces, its line's way round (see facedWallPiece). */
  const lineFacesOf = (opening: SceneObject): [string, string] => {
    const [front, back] = facesOf(opening)

    return isTurnedFromLine(opening) ? [back, front] : [front, back]
  }

  for (const opening of objects) {
    if (!isOpening(opening.type)) continue

    const [startNode, endNode] = edgeNodes(opening)
    const frame = opening.type === "glassDoor" ? GLASS_DOOR_FRAME : PALETTE.doorFrame
    const leafColor = opening.type === "glassDoor" ? WINDOW_GLASS : PALETTE.doorLeaf
    if (isDiagonalEdge(opening.rotation)) {
      // On a diagonal: a window is wall with glass down its middle; a door, its
      // two jambs, and its leaf standing open with its swing, as straight ones.
      if (opening.type === "window") {
        facedDiagonalWallPiece(
          { start: startNode, end: endNode, rotation: opening.rotation },
          facesOf(opening),
          {}
        )
        diagonalWallPiece({ start: startNode, end: endNode }, WINDOW_GLASS, {
          extend: -0.06,
          across: HALF_WALL * 0.35,
        })
        continue
      }

      const span = Math.hypot(endNode.x - startNode.x, endNode.z - startNode.z)
      const along = { x: (endNode.x - startNode.x) / span, z: (endNode.z - startNode.z) / span }
      const lerp = (distance: number) => ({
        x: startNode.x + along.x * distance,
        z: startNode.z + along.z * distance,
      })
      diagonalWallPiece({ start: startNode, end: lerp(POST) }, frame, { extend: 0 })
      diagonalWallPiece({ start: lerp(span - POST), end: endNode }, frame, { extend: 0 })
      // Hinged at the first jamb, the leaf opens to the door's front (its +Z);
      // the swing runs from where it shuts to where it stands.
      const front = { x: Math.sin(opening.rotation), z: Math.cos(opening.rotation) }
      const leafLength = span - POST * 2
      const hinge = lerp(POST)
      const shut = lerp(POST + leafLength)
      const open = { x: hinge.x + front.x * leafLength, z: hinge.z + front.z * leafLength }
      const sweep = along.x * front.z - along.z * front.x > 0 ? 1 : 0
      push(
        { x0: hinge.x, x1: hinge.x, z0: hinge.z, z1: hinge.z, y0: 0, y1: 0.02 },
        <DoorLeaf
          swing={`M${shut.x} ${shut.z} A${leafLength} ${leafLength} 0 0 ${sweep} ${open.x} ${open.z}`}
          hinge={[hinge.x, hinge.z]}
          open={[open.x, open.z]}
          wall={wall}
          color={leafColor}
        />
      )
      continue
    }

    const alongX = runsAlongX(opening.rotation)
    const fixed = alongX ? startNode.z : startNode.x
    const [from, to] = alongX
      ? [Math.min(startNode.x, endNode.x), Math.max(startNode.x, endNode.x)]
      : [Math.min(startNode.z, endNode.z), Math.max(startNode.z, endNode.z)]
    const line = { alongX, fixed, from, to }
    if (opening.type === "window") {
      facedWallPiece(line, lineFacesOf(opening))
      wallPiece(line, WINDOW_GLASS, { extend: -0.06, across: HALF_WALL * 0.35 })
      continue
    }

    wallPiece({ ...line, to: from + POST }, frame, { extend: 0 })
    wallPiece({ ...line, from: to - POST }, frame, { extend: 0 })
    // The leaf opens to the door's front (its +Z), hinged at the `from` jamb.
    const side = alongX
      ? Math.sign(Math.cos(opening.rotation)) || 1
      : Math.sign(Math.sin(opening.rotation)) || 1
    const leafLength = to - from - POST * 2
    const hinge = from + POST
    const at = (along: number, across: number): [number, number] =>
      alongX ? [along, across] : [across, along]
    const [hingeX, hingeZ] = at(hinge, fixed)
    const [openX, openZ] = at(hinge + leafLength, fixed)
    const [leafX, leafZ] = at(hinge, fixed + side * leafLength)
    push(
      { x0: hingeX, x1: hingeX, z0: hingeZ, z1: hingeZ, y0: 0, y1: 0.02 },
      <DoorLeaf
        swing={`M${openX} ${openZ} A${leafLength} ${leafLength} 0 0 ${alongX === side > 0 ? 1 : 0} ${leafX} ${leafZ}`}
        hinge={[hingeX, hingeZ]}
        open={[leafX, leafZ]}
        wall={wall}
        color={leafColor}
      />
    )
  }
}

/** A door's leaf standing open from its hinge, and the dashed arc it swings along. */
const DoorLeaf = ({
  swing,
  hinge,
  open,
  wall,
  color,
}: {
  /** The swing's arc (an SVG path). */
  swing: string
  hinge: [number, number]
  open: [number, number]
  wall: string
  color: string
}) => (
  <g>
    <path
      d={swing}
      fill="none"
      stroke={shade(wall, 0.7)}
      strokeWidth={0.02}
      strokeDasharray="0.06 0.05"
    />
    <line
      x1={hinge[0]}
      y1={hinge[1]}
      x2={open[0]}
      y2={open[1]}
      stroke={color}
      strokeWidth={0.06}
      strokeLinecap="round"
    />
  </g>
)
