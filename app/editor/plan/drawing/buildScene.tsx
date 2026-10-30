import { Fragment } from "react"
import type { PlanDrawings } from "../../module"
import { composeWallColors } from "../../layout"
import { sortBottomToTop, type Drawable, type Extent } from "../shapes"
import type { Bounds } from "../planView"
import { drawFloor } from "./floor"
import { drawFurniture, type FurnitureInput } from "./furniture"
import { drawOpenings } from "./openings"
import { createWallPieces } from "./wallPieces"
import { drawWalls } from "./walls"

/** Up to this height (m) a piece lies flat on the floor (rugs): under the shadows. */
const FLAT = 0.02

interface SceneInput extends FurnitureInput {
  /** The theme's wall colour (unpainted faces). */
  wall: string
  /** The modules' own drawings: on the floor under the pieces, and over them. */
  drawings: PlanDrawings[]
}

/**
 * Everything in plan units (metres, top-down): the rooms' floor and the
 * modules' floor drawings, then walls, doors and furniture layered bottom to
 * top, then the modules' drawings over them — and the drawing's bounds (for
 * fitting).
 */
export const buildScene = ({ wall, drawings, ...furnitureInput }: SceneInput) => {
  // Panning reuses this whole element (memoized), so React skips it entirely.
  const { objects, floorInside } = furnitureInput
  const drawables: Drawable[] = []
  const push = (extent: Extent, node: React.ReactNode) =>
    drawables.push({ extent, node, order: drawables.length })

  const pieces = createWallPieces(push)
  const wallColors = composeWallColors(objects)
  const wallDrawing = { objects, wall, wallColors, pieces, push }
  drawWalls(wallDrawing)
  drawOpenings(wallDrawing)
  const { shadows } = drawFurniture(furnitureInput, push)

  let bounds: Bounds | null = null
  for (const { extent } of drawables) {
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, extent.minX),
          maxX: Math.max(bounds.maxX, extent.maxX),
          minY: Math.min(bounds.minY, extent.minZ),
          maxY: Math.max(bounds.maxY, extent.maxZ),
        }
      : { minX: extent.minX, maxX: extent.maxX, minY: extent.minZ, maxY: extent.maxZ }
  }

  const layered = sortBottomToTop(drawables)

  return {
    bounds,
    node: (
      <>
        {drawFloor(objects, floorInside)}
        {drawings.map((drawing, i) => (
          <Fragment key={`floor${i}`}>{drawing.floor}</Fragment>
        ))}
        {layered
          .filter((drawable) => drawable.extent.maxY <= FLAT)
          .map((drawable, i) => (
            <g key={`flat${i}`}>{drawable.node}</g>
          ))}
        <g fill="#000000" opacity={0.13}>
          {shadows}
        </g>
        {layered
          .filter((drawable) => drawable.extent.maxY > FLAT)
          .map((drawable, i) => (
            <g key={i}>{drawable.node}</g>
          ))}
        {drawings.map((drawing, i) => (
          <Fragment key={`top${i}`}>{drawing.top}</Fragment>
        ))}
      </>
    ),
  }
}
