/**
 * Shared footprint / height constants (world units) so walls, doors and desks
 * line up on the same grid and share a consistent scale.
 */
export const WALL = {
  width: 1,
  height: 1.4,
  depth: 0.14,
  /** How far the base is sunk below the floor to avoid a bright contact gap. */
  sink: 0.08,
}

export const DESK = {
  width: 1.6,
  depth: 0.9,
  topThickness: 0.08,
  height: 0.74,
  legThickness: 0.08,
}

export const SEAT = {
  cushion: 0.62,
  cushionThickness: 0.12,
  seatHeight: 0.46,
  backHeight: 0.6,
}

/** Where a workstation's chair stands when pulled out (local z). */
export const WORKSTATION_SEAT_Z = 0.4
/** Where a deskmate's chair stands (local z). */
export const DESKMATE_SEAT_Z = 0.4
