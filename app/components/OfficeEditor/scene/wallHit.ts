import { Box3, Matrix4, Ray, Vector3 } from "three"
import { edgeLength } from "../layout"
import { WALL } from "../objects/dimensions"
import type { SceneObject } from "../types"

const toWall = new Matrix4()
const fromWall = new Matrix4()
const localRay = new Ray()
const box = new Box3()

/**
 * Where a ray meets a wall/door/window segment (written into `hit`), or null.
 * The segment is a box in its own frame — along its run, whichever way it
 * runs (diagonals too) — `slack` wider and taller, so grazing its top counts.
 */
export const intersectEdge = (ray: Ray, o: SceneObject, hit: Vector3, slack = 0) => {
  const half = edgeLength(o) / 2
  toWall.makeRotationY(o.rotation).setPosition(o.x, 0, o.z)
  fromWall.copy(toWall).invert()
  localRay.copy(ray).applyMatrix4(fromWall)
  box.min.set(-half, -WALL.sink, -WALL.depth / 2 - slack)
  box.max.set(half, WALL.height + slack, WALL.depth / 2 + slack)
  if (!localRay.intersectBox(box, hit)) return null
  return hit.applyMatrix4(toWall)
}
