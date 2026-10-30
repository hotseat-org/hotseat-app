import type { Camera } from "three"
import { Plane, Ray, Vector3 } from "three"

/**
 * Where the camera starts, from its target. Ortho, so the distance doesn't
 * change the picture — but it must be far enough back that, tilted low and
 * zoomed out, the ground at the bottom of the screen is still in front of it
 * (closer in, the near plane cut the endless ground off in a band).
 */
export const CAMERA_OFFSET: [number, number, number] = [88, 80, 88]
/** The fog's stops were tuned for a camera 37 m out: shift them by the extra. */
export const FOG_SHIFT = Math.hypot(...CAMERA_OFFSET) - 37

const GROUND = new Plane(new Vector3(0, 1, 0), 0)
const ray = new Ray()

/**
 * Where the camera is looking: the ground point at the centre of the view
 * (written into `out`). Not the point under the camera — with our angled
 * camera that lies far off towards the viewer.
 */
export const getViewCentre = (camera: Camera, out: Vector3) => {
  camera.getWorldPosition(ray.origin)
  camera.getWorldDirection(ray.direction)

  return ray.intersectPlane(GROUND, out)
}
