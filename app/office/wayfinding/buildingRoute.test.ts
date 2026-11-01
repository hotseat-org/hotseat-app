/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
// The office's furniture: the desk.
import "../catalog"
import { getBuildingRoute } from "./wayfinding"
import { openingPlan, roomEdges, type Floor, type SceneObject } from "~/editor/core"

const FLOORS: Floor[] = [
  { id: "ground", name: "" },
  { id: "first", name: "" },
]

let nextId = 0
const toPieces = (floor: string, pieces: Omit<SceneObject, "id">[]): SceneObject[] =>
  pieces.map((piece) => ({ id: `p${nextId++}`, floor, ...piece }))

/** A 10 × 8 m room on a floor; on the ground floor, a door out in its front wall. */
const composeRoom = (floor: string, hasDoor: boolean) => {
  const walls = toPieces(
    floor,
    roomEdges({ x: 0, z: 0 }, { x: 10, z: 8 }).map((edge) => ({ type: "wall" as const, ...edge }))
  )
  if (!hasDoor) return walls

  const front = walls.find((wall) => wall.z === 8 && wall.x === 5.25)!
  const plan = openingPlan(walls, { id: front.id, kind: "door" })!

  return [...walls.filter((wall) => !plan.remove.includes(wall.id)), ...toPieces(floor, plan.add)]
}

const stairs = toPieces("ground", [{ type: "stairs", x: 2, z: 4, rotation: 0 }])
const lift = toPieces("ground", [{ type: "lift", x: 8.25, z: 2.25, rotation: 0 }])
const desk = toPieces("first", [{ type: "workstation", x: 5, z: 3, rotation: 0 }])
const building = [...composeRoom("ground", true), ...composeRoom("first", false), ...desk]

describe("the way through the building", () => {
  test("goes up the stairs to a desk upstairs: a leg on each floor", () => {
    const route = getBuildingRoute({
      pieces: [...building, ...stairs],
      floors: FLOORS,
      deskId: desk[0].id,
    })

    expect(route?.legs.map((leg) => [leg.floorId, leg.next?.kind])).toEqual([
      ["ground", "stairs"],
      ["first", undefined],
    ])
    // Upstairs, it starts at the stairs' top (their back end).
    const [startX, startZ] = route!.legs[1].points[0]
    expect(Math.abs(startX - 2)).toBeLessThan(0.6)
    expect(startZ).toBeLessThan(2.5)
  })

  test("takes the lift when there's one and it's the shorter way", () => {
    const route = getBuildingRoute({
      pieces: [...building, ...lift],
      floors: FLOORS,
      deskId: desk[0].id,
    })

    expect(route?.legs.map((leg) => leg.next?.kind)).toEqual(["lift", undefined])
  })

  test("has no way up without stairs or a lift", () => {
    expect(getBuildingRoute({ pieces: building, floors: FLOORS, deskId: desk[0].id })).toBeNull()
  })
})
