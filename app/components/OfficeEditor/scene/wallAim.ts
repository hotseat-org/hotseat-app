import { Plane, Vector3, type Camera, type Raycaster, type Vector2 } from "three"
import { WALL } from "../objects/dimensions"

/** Half-way up the walls — where you point when you point at a wall. */
const WALL_AIM = new Plane(new Vector3(0, 1, 0), -WALL.height / 2)
const hit = new Vector3()

/**
 * Where the cursor meets wall height (not the floor): pointing at a wall face
 * then means that face, not the floor hidden behind the wall. Used to hang
 * wall items. Null if the ray misses (looking up).
 */
export const aimAtWallHeight = (raycaster: Raycaster, pointer: Vector2, camera: Camera) => {
  raycaster.setFromCamera(pointer, camera)
  return raycaster.ray.intersectPlane(WALL_AIM, hit) ? { x: hit.x, z: hit.z } : null
}
