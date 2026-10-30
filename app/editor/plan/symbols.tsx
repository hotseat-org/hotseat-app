import { getItem, type ObjectType } from "../catalog"
import { getRenderer } from "../catalog/rendering"
import { GRID, type SceneObject } from "../types"
import { Sketch, type DrawSymbol, type PieceDrawing, type PieceState } from "./sketch"

const half = (type: ObjectType): [number, number] => [
  (getItem(type).footprint[0] * GRID) / 2,
  (getItem(type).footprint[1] * GRID) / 2,
]

/** A kind without a symbol of its own: a plain box its size. */
const drawBox: DrawSymbol = ({ sketch, color, halfX, halfZ }) => {
  sketch.rect(-halfX + 0.04, -halfZ + 0.04, halfX - 0.04, halfZ - 0.04, color, 0.04)
  sketch.shadowRect(-halfX + 0.04, -halfZ + 0.04, halfX - 0.04, halfZ - 0.04, 0.04)

  return sketch.done(1)
}

/**
 * A piece of furniture as a top-down symbol (walls, doors and floor paint are
 * drawn by the plan itself; ceiling lights not at all — they'd cover the room).
 */
export const drawPiece = (
  object: SceneObject,
  state: PieceState = {},
  tone: (color: string) => string = (color) => color
): PieceDrawing | null => {
  const draw = getRenderer(object.type).drawSymbol
  if (draw === null) return null

  const [halfX, halfZ] = half(object.type)

  return (draw ?? drawBox)({
    sketch: new Sketch(tone),
    object,
    color: object.color ?? getItem(object.type).defaultColor,
    halfX,
    halfZ,
    isOn: state.occupied !== false,
    state,
  })
}
