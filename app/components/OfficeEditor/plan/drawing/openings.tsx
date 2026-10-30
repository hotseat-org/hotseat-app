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
import { WINDOW_GLASS } from "../kits"
import { shade } from "../shapes"
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
  const facesOf = (o: SceneObject): [string, string] => {
    const [front, back] = wallColors.openings.get(o.id) ?? [undefined, undefined]
    return [front ?? wall, back ?? wall]
  }
  /** Built turned about from its line's way (the faces swap). */
  const isTurnedFromLine = (o: SceneObject) =>
    Math.cos(o.rotation - EDGE_ROTATION[edgeDirection(o.rotation)]) < 0
  /** An opening's faces, its line's way round (see facedWallPiece). */
  const lineFacesOf = (o: SceneObject): [string, string] => {
    const [front, back] = facesOf(o)
    return isTurnedFromLine(o) ? [back, front] : [front, back]
  }

  for (const o of objects) {
    if (o.type !== "window" && o.type !== "door" && o.type !== "glassDoor") continue
    const [a, b] = edgeNodes(o)
    const frame = o.type === "glassDoor" ? GLASS_DOOR_FRAME : PALETTE.doorFrame
    const leafColor = o.type === "glassDoor" ? WINDOW_GLASS : PALETTE.doorLeaf
    if (isDiagonalEdge(o.rotation)) {
      // On a diagonal: a window is wall with glass down its middle; a door, its
      // two jambs, and its leaf standing open with its swing, as straight ones.
      if (o.type === "window") {
        facedDiagonalWallPiece(a, b, o.rotation, facesOf(o), {})
        diagonalWallPiece(a, b, WINDOW_GLASS, { extend: -0.06, across: HALF_WALL * 0.35 })
        continue
      }
      const span = Math.hypot(b.x - a.x, b.z - a.z)
      const along = { x: (b.x - a.x) / span, z: (b.z - a.z) / span }
      const lerp = (d: number) => ({ x: a.x + along.x * d, z: a.z + along.z * d })
      diagonalWallPiece(a, lerp(POST), frame, { extend: 0 })
      diagonalWallPiece(lerp(span - POST), b, frame, { extend: 0 })
      // Hinged at the first jamb, the leaf opens to the door's front (its +Z);
      // the swing runs from where it shuts to where it stands.
      const front = { x: Math.sin(o.rotation), z: Math.cos(o.rotation) }
      const len = span - POST * 2
      const hinge = lerp(POST)
      const shut = lerp(POST + len)
      const open = { x: hinge.x + front.x * len, z: hinge.z + front.z * len }
      const sweep = along.x * front.z - along.z * front.x > 0 ? 1 : 0
      push(
        { x0: hinge.x, x1: hinge.x, z0: hinge.z, z1: hinge.z, y0: 0, y1: 0.02 },
        <DoorLeaf
          swing={`M${shut.x} ${shut.z} A${len} ${len} 0 0 ${sweep} ${open.x} ${open.z}`}
          hinge={[hinge.x, hinge.z]}
          open={[open.x, open.z]}
          wall={wall}
          color={leafColor}
        />
      )
      continue
    }
    const alongX = runsAlongX(o.rotation)
    const fixed = alongX ? a.z : a.x
    const [from, to] = alongX
      ? [Math.min(a.x, b.x), Math.max(a.x, b.x)]
      : [Math.min(a.z, b.z), Math.max(a.z, b.z)]
    if (o.type === "window") {
      facedWallPiece(alongX, fixed, from, to, lineFacesOf(o))
      wallPiece(alongX, fixed, from, to, WINDOW_GLASS, { extend: -0.06, across: HALF_WALL * 0.35 })
      continue
    }
    wallPiece(alongX, fixed, from, from + POST, frame, { extend: 0 })
    wallPiece(alongX, fixed, to - POST, to, frame, { extend: 0 })
    // The leaf opens to the door's front (its +Z), hinged at the `from` jamb.
    const side = alongX
      ? Math.sign(Math.cos(o.rotation)) || 1
      : Math.sign(Math.sin(o.rotation)) || 1
    const len = to - from - POST * 2
    const hinge = from + POST
    const at = (u: number, v: number): [number, number] => (alongX ? [u, v] : [v, u])
    const [hx, hz] = at(hinge, fixed)
    const [ox, oz] = at(hinge + len, fixed)
    const [lx, lz] = at(hinge, fixed + side * len)
    push(
      { x0: hx, x1: hx, z0: hz, z1: hz, y0: 0, y1: 0.02 },
      <DoorLeaf
        swing={`M${ox} ${oz} A${len} ${len} 0 0 ${alongX === side > 0 ? 1 : 0} ${lx} ${lz}`}
        hinge={[hx, hz]}
        open={[lx, lz]}
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
