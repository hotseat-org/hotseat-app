/** A quarter turn: what an edge running along Z is built with. */
export const ALONG_Z = Math.PI / 2

/** Furniture turns in eighths: 45° steps. */
export const ROTATION_STEP = Math.PI / 4

/** A rotation to its nearest 45° step, as an exact value in [0, 2π). */
export const toRotationStep = (rotation: number) => {
  const steps = ((Math.round(rotation / ROTATION_STEP) % 8) + 8) % 8
  return steps * ROTATION_STEP
}

/** Turned off the grid's axes (45°, 135°…), not a whole quarter turn. */
export const isDiagonal = (rotation: number) => {
  const quarters = rotation / ALONG_Z
  return Math.abs(quarters - Math.round(quarters)) > 0.01
}
