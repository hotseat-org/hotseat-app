import type { ReactNode } from "react"
import type { PlanPieceStyle } from "../../module"
import { footprintCells } from "../../layout"
import { GRID, isEdgeType, isMarker, type SceneObject } from "../../types"
import { drawPiece } from "../symbols"
import { mix } from "../shapes"
import type { Push } from "./wallPieces"

/** How far a muted piece fades toward the floor (0…1). */
const MUTED = 0.55

export interface FurnitureInput {
  objects: SceneObject[]
  floorInside: string
  /** How the modules draw each piece (see PlanModule.usePieceStyles). */
  styleOf: (object: SceneObject) => PlanPieceStyle | undefined
  /** Whether a piece answers a click (a module's: a desk opens its card). */
  isClickable: (object: SceneObject) => boolean
  onPiece: (id: string) => void
  /** The clickable piece the pointer is over, or none (left). */
  onHover?: (id: string | null) => void
}

/**
 * Furniture, each in its modules' style (a desk by who's in, the rest muted
 * so desks stand out): the pieces go into `push`, their soft shadows come
 * back as a layer of their own.
 */
export const drawFurniture = (
  { objects, floorInside, styleOf, isClickable, onPiece, onHover }: FurnitureInput,
  push: Push
) => {
  /** A muted piece, blended this far toward the floor. */
  const subdue = (color: string) => mix(color, floorInside, MUTED)
  /** Furniture's soft shadows: one layer over the floor and rugs, under the pieces. */
  const shadows: ReactNode[] = []

  for (const object of objects) {
    if (isEdgeType(object.type) || isMarker(object.type)) continue

    const style = styleOf(object)
    const piece = drawPiece(
      object,
      { occupied: style?.isOccupied },
      style?.isMuted ? subdue : undefined
    )
    if (!piece) continue

    const isPieceClickable = isClickable(object)
    const open = (event: React.MouseEvent) => {
      event.stopPropagation()
      onPiece(object.id)
    }
    // The symbol is drawn in the piece's frame: move and turn it into place
    // (its +Z front turned by `rotation`, as in 3D). The shadow falls the same
    // way for every piece: down and to the right.
    const turn = (-object.rotation * 180) / Math.PI
    const [cellsX, cellsZ] = footprintCells(object.type, object.rotation)
    push(
      {
        minX: object.x - (cellsX * GRID) / 2,
        maxX: object.x + (cellsX * GRID) / 2,
        minZ: object.z - (cellsZ * GRID) / 2,
        maxZ: object.z + (cellsZ * GRID) / 2,
        minY: 0,
        maxY: piece.height,
      },
      <g
        transform={`translate(${object.x} ${object.z}) rotate(${turn})`}
        className={isPieceClickable ? "cursor-pointer" : undefined}
        onClick={isPieceClickable ? open : undefined}
        onPointerEnter={isPieceClickable && onHover ? () => onHover(object.id) : undefined}
        onPointerLeave={isPieceClickable && onHover ? () => onHover(null) : undefined}
        opacity={style?.isDimmed ? 0.3 : undefined}
      >
        {piece.node}
      </g>
    )
    if (piece.height > 0.05)
      shadows.push(
        <g
          key={object.id}
          transform={`translate(${object.x + 0.04} ${object.z + 0.07}) rotate(${turn})`}
        >
          {piece.silhouette}
        </g>
      )
  }

  return { shadows }
}
