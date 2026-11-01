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

/**
 * What a piece is picked by: a column under each of its parts, from the floor
 * up to the part's top. Under a tabletop it's solid (the pointer can't slip
 * between a desk's legs to the desk behind), yet it's no taller than the part
 * it stands for — a box as tall as the monitor over the whole desk stuck out,
 * at an angle, over the desks behind it.
 * `model` is measured in `frame`'s space (the piece's turned group).
 */
export const composeHitShape = (model: Object3D, frame: Object3D): BufferGeometry | null => {
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

  const boxes = outer.map((column) => {
    const size = column.getSize(new Vector3())
    const centre = column.getCenter(new Vector3())

    return new BoxGeometry(
      Math.max(size.x, MIN_SIZE),
      size.y,
      Math.max(size.z, MIN_SIZE)
    ).translate(centre.x, centre.y, centre.z)
  })
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

  bounds.min.y = 0
  bounds.max.y = Math.min(bounds.max.y, MAX_HEIGHT)

  return bounds
}

/** Whether `inner` lies within `outer` (of two equal ones, the later is dropped). */
const isInside = (inner: Box3, outer: Box3, isLater: boolean) =>
  outer.containsBox(inner) && (isLater || !inner.containsBox(outer))
