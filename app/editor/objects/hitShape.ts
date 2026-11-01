import {
  Box3,
  BoxGeometry,
  Matrix4,
  Mesh,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

/** The most a part's column may stand (m), and the least worth one. */
const MAX_HEIGHT = 2.2
const MIN_SIZE = 0.02
/** How high the floor of its footprint stands (m): about its plinth's height. */
const BASE_HEIGHT = 0.05
/**
 * How far it stands proud of the model (m): always the nearest hit, so the
 * pointer stays on one thing of the piece's (R3F leaves a group, for a frame,
 * when what's nearest within it changes — a blink of its plinth).
 */
const PROUD = 0.01

/**
 * What a piece is picked by: a column under each of its parts, from the floor
 * up to the part's top. Under a tabletop it's solid (the pointer can't slip
 * between a desk's legs to the desk behind), yet it's no taller than the part
 * it stands for — a box as tall as the monitor over the whole desk stuck out,
 * at an angle, over the desks behind it.
 * And a low base over its whole footprint: crossing the gap between its parts
 * (a desk and its chair) doesn't leave it, so its plinth doesn't blink.
 * `model` is measured in `frame`'s space (the piece's turned group).
 */
export const composeHitShape = (
  model: Object3D,
  frame: Object3D,
  footprint: [number, number]
): BufferGeometry | null => {
  frame.updateWorldMatrix(true, false)
  const toFrame = new Matrix4().copy(frame.matrixWorld).invert()
  const columns: Box3[] = []

  // The originals, not the baked meshes they're merged into (one of those
  // spans every part of a colour: see BAKED_OUTPUT).
  const measure = (object: Object3D) => {
    if (object.userData.isBakedOutput) return

    if (object instanceof Mesh) {
      object.updateWorldMatrix(true, false)
      const column = getColumn(object, toFrame)
      if (column) columns.push(column)
    }

    object.children.forEach(measure)
  }
  measure(model)

  // A column inside another (a monitor's, over its desk's) adds nothing.
  const outer = columns.filter(
    (column, index) =>
      !columns.some(
        (other, otherIndex) => otherIndex !== index && isInside(column, other, index > otherIndex)
      )
  )
  if (outer.length === 0) return null

  const base = new BoxGeometry(
    footprint[0] + PROUD * 2,
    BASE_HEIGHT,
    footprint[1] + PROUD * 2
  ).translate(0, BASE_HEIGHT / 2, 0)
  const columnBoxes = outer.map((column) => {
    const size = column.getSize(new Vector3())
    const centre = column.getCenter(new Vector3())

    return new BoxGeometry(
      Math.max(size.x, MIN_SIZE),
      size.y,
      Math.max(size.z, MIN_SIZE)
    ).translate(centre.x, centre.y, centre.z)
  })
  const boxes = [base, ...columnBoxes]
  const shape = mergeGeometries(boxes, false)
  boxes.forEach((box) => box.dispose())

  return shape
}

/** The column under a part: its bounds in the frame, down to the floor. */
const getColumn = (part: Mesh, toFrame: Matrix4) => {
  const { geometry } = part
  if (!geometry.boundingBox) geometry.computeBoundingBox()

  const bounds = geometry.boundingBox
    ?.clone()
    .applyMatrix4(new Matrix4().multiplyMatrices(toFrame, part.matrixWorld))
  if (!bounds || bounds.isEmpty() || bounds.max.y < MIN_SIZE) return null

  bounds.expandByScalar(PROUD)
  bounds.min.y = 0
  bounds.max.y = Math.min(bounds.max.y, MAX_HEIGHT + PROUD)

  return bounds
}

/** Whether `inner` lies within `outer` (of two equal ones, the later is dropped). */
const isInside = (inner: Box3, outer: Box3, isLater: boolean) =>
  outer.containsBox(inner) && (isLater || !inner.containsBox(outer))
