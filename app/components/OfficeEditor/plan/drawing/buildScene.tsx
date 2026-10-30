import { composeWallColors } from "../../layout"
import { sortBottomToTop, type Drawable, type Extent } from "../shapes"
import type { Bounds } from "../planView"
import { drawFloor } from "./floor"
import { drawFurniture, type FurnitureInput } from "./furniture"
import { drawOpenings } from "./openings"
import { createWallPieces } from "./wallPieces"
import { drawWalls } from "./walls"
import { drawZones, type ZonesInput } from "./zones"

/** Up to this height (m) a piece lies flat on the floor (rugs): under the shadows. */
const FLAT = 0.02

interface SceneInput extends FurnitureInput {
  /** The theme's wall colour (unpainted faces). */
  wall: string
  /** Team zones (the Zones layer), on the floor under the furniture. */
  zones?: ZonesInput
}

/**
 * Everything in plan units (metres, top-down): the rooms' floor, then walls,
 * doors and furniture layered bottom to top, then desk markers for the shown
 * day — and the drawing's bounds (for fitting).
 */
export const buildScene = ({ wall, zones, ...furnitureInput }: SceneInput) => {
  // Panning reuses this whole element (memoized), so React skips it entirely.
  const { objects, floorInside } = furnitureInput
  const drawables: Drawable[] = []
  const push = (ext: Extent, node: React.ReactNode) =>
    drawables.push({ ext, node, order: drawables.length })

  const pieces = createWallPieces(push)
  const wallColors = composeWallColors(objects)
  drawWalls(objects, wall, wallColors, pieces, push)
  drawOpenings(objects, wall, wallColors, pieces, push)
  const { shadows, markers, heatPads, occupants } = drawFurniture(furnitureInput, push)

  let bounds: Bounds | null = null
  for (const { ext: e } of drawables) {
    bounds = bounds
      ? {
          x0: Math.min(bounds.x0, e.x0),
          x1: Math.max(bounds.x1, e.x1),
          y0: Math.min(bounds.y0, e.z0),
          y1: Math.max(bounds.y1, e.z1),
        }
      : { x0: e.x0, x1: e.x1, y0: e.z0, y1: e.z1 }
  }

  const layered = sortBottomToTop(drawables)
  return {
    bounds,
    occupants,
    node: (
      <>
        {drawFloor(objects, floorInside)}
        {zones && drawZones(zones)}
        {heatPads}
        {layered
          .filter((d) => d.ext.y1 <= FLAT)
          .map((d, i) => (
            <g key={`flat${i}`}>{d.node}</g>
          ))}
        <g fill="#000000" opacity={0.13}>
          {shadows}
        </g>
        {layered
          .filter((d) => d.ext.y1 > FLAT)
          .map((d, i) => (
            <g key={i}>{d.node}</g>
          ))}
        {markers}
      </>
    ),
  }
}
