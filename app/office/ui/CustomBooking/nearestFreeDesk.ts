import { type SceneObject } from "~/editor/types"
import { deskState, type BookingsByDay, type Day } from "~/utils/booking"

const distance = (first: SceneObject, second: SceneObject) =>
  Math.hypot(first.x - second.x, first.z - second.z)

/** The free desk closest to `desk` on a day, for when `desk` itself is taken. */
export const findNearestFreeDesk = (
  desk: SceneObject,
  desks: SceneObject[],
  day: Day,
  byDay: BookingsByDay,
  released: BookingsByDay
) =>
  desks
    .filter(
      (candidate) =>
        candidate.id !== desk.id && deskState(candidate, day, byDay, released).kind === "free"
    )
    .sort((first, second) => distance(first, desk) - distance(second, desk))[0]
