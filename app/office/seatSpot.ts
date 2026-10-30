import { DESKMATE_SEAT_Z, SEAT, WORKSTATION_SEAT_Z } from "~/editor/objects/dimensions"
import type { SceneObject } from "~/editor/types"

/** How far in front of a plain desk its chair usually stands (local z). */
const DESK_CHAIR_Z = 0.9
/** A chair counts as the desk's when it's this close to that spot. */
const CHAIR_REACH = 0.55
/** Sitting on a cushion, not in it. */
const ON_SEAT = SEAT.seatHeight + 0.06

export interface Spot {
  x: number
  y: number
  z: number
  /** Which way the pet faces (towards the desk). */
  rotation: number
}

/** A point in a piece's local space, in world space. */
export const toWorld = (object: SceneObject, localX: number, localZ: number) => ({
  x: object.x + localX * Math.cos(object.rotation) + localZ * Math.sin(object.rotation),
  z: object.z - localX * Math.sin(object.rotation) + localZ * Math.cos(object.rotation),
})

/**
 * Where a desk's pet sits: on the chair a workstation/deskmate pulls out, on
 * the free-standing chair placed in front of a plain desk, or — a plain desk
 * with no chair — on the floor in front of it.
 */
export const spotFor = (desk: SceneObject, seats: SceneObject[]): Spot => {
  const facingDesk = desk.rotation + Math.PI
  if (desk.type === "workstation" || desk.type === "deskmate") {
    const point = toWorld(
      desk,
      0,
      desk.type === "workstation" ? WORKSTATION_SEAT_Z : DESKMATE_SEAT_Z
    )

    return { ...point, y: ON_SEAT, rotation: facingDesk }
  }

  const chair = findDeskChair(desk, seats)
  if (chair) return { x: chair.x, y: ON_SEAT, z: chair.z, rotation: chair.rotation }

  const floor = toWorld(desk, 0, 0.7)

  return { ...floor, y: 0, rotation: facingDesk }
}

/** The free-standing chair placed in front of a plain desk, if there is one. */
export const findDeskChair = (desk: SceneObject, seats: SceneObject[]) => {
  const front = toWorld(desk, 0, DESK_CHAIR_Z)

  return seats
    .map((seat) => ({ s: seat, d: Math.hypot(seat.x - front.x, seat.z - front.z) }))
    .filter((candidate) => candidate.d <= CHAIR_REACH)
    .sort((first, second) => first.d - second.d)[0]?.s
}
