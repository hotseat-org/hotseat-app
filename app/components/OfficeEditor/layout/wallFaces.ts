import { isOpening, type SceneObject } from "../types"
import { getEdge } from "../catalog/items"

/** A wall's two faces' paint: its front (its +Z side as built) and back. */
export type WallFaces = [front: string | undefined, back: string | undefined]

/**
 * What the Paint tool paints: walls, and the windows in them (face by face,
 * like the wall). Doors keep their wooden frames.
 */
export const isPaintable = (edge: SceneObject) => !!getEdge(edge.type)?.isPaintable

/** Whether a window has paint of its own (else it takes its wall's). */
export const hasOwnPaint = (opening: SceneObject) =>
  opening.colorFront !== undefined || opening.colorBack !== undefined

/**
 * The paint on each face of a wall (undefined = the theme's wall colour). A
 * window's own (its `color` is its frame's) — see
 * composeWallColors for what it shows.
 */
export const getWallFaces = (wall: SceneObject): WallFaces =>
  hasOwnPaint(wall) || isOpening(wall.type)
    ? [wall.colorFront, wall.colorBack]
    : [wall.color, wall.color]

/** Faces as seen from a wall turned the other way round (front ⇄ back). */
const flipFaces = ([front, back]: WallFaces): WallFaces => [back, front]

/** Whether two edges of a line are built facing opposite ways. */
const isTurnedFrom = (first: SceneObject, second: { rotation: number }) =>
  Math.cos(first.rotation - second.rotation) < 0

/** A wall's faces as seen from `from`'s way round (a run's, an opening's). */
export const getWallFacesFrom = (wall: SceneObject, from: { rotation: number }): WallFaces =>
  isTurnedFrom(wall, from) ? flipFaces(getWallFaces(wall)) : getWallFaces(wall)

/**
 * The fields that carry faces' paint, for these faces (none when themed): a
 * wall's one `color` when they match; a window's always per face
 * (its `color` is its frame's or leaf's).
 */
export const composeFacePaint = (
  [front, back]: WallFaces,
  isOpeningPaint = false
): Partial<SceneObject> => {
  const fields =
    front === back && !isOpeningPaint ? { color: front } : { colorFront: front, colorBack: back }
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined))
}

/** A window's own paint, to carry over when it's swapped (kept by a door between) or moved. */
export const getOpeningPaint = (opening: SceneObject) =>
  composeFacePaint([opening.colorFront, opening.colorBack], true)
