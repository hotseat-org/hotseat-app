import { Matrix4, type Object3D } from "three"

/**
 * Where `object` stands within `ancestor` (its transform there), from the
 * local transforms between them — not their world matrices: baking freezes
 * a piece's merged parts, whose world matrices then stay as they were when
 * baked, though the piece has turned since (its outline went askew).
 */
export const getMatrixWithin = (object: Object3D, ancestor: Object3D) => {
  const matrix = new Matrix4()
  let current: Object3D | null = object

  while (current && current !== ancestor) {
    if (current.matrixAutoUpdate) current.updateMatrix()

    matrix.premultiply(current.matrix)
    current = current.parent
  }

  return matrix
}
