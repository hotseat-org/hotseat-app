import type { Matrix4 } from "three"

/**
 * Smallest change in a camera matrix that counts as the camera moving. Orbit
 * damping eases out forever in ever smaller steps; checking for an exact
 * match, those never-ending nudges kept the camera "moving" after every pan.
 * 1e-4 is far below a pixel at any zoom.
 */
const MIN_MOVE = 1e-4

/** Has the camera matrix changed visibly from `prev`? */
export const hasMatrixMoved = (prev: Matrix4, next: Matrix4) =>
  next.elements.some((value, i) => Math.abs(value - prev.elements[i]) > MIN_MOVE)
