/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
// The office's furniture serves as the test pieces.
import "./office/catalog"
import { enclosedRegions, roomEdges } from "./layout"
import type { ObjectType, SceneObject } from "./types"
import { composeWallShift, findWallGrip } from "./wallShift"

let nextId = 0
const place = (type: ObjectType, x: number, z: number, rotation = 0): SceneObject => ({
  id: `o${nextId++}`,
  type,
  x,
  z,
  rotation,
})
const room = (x0: number, z0: number, x1: number, z1: number) =>
  roomEdges({ x: x0, z: z0 }, { x: x1, z: z1 }).map((edge) =>
    place("wall", edge.x, edge.z, edge.rotation)
  )
const floorOf = (objects: SceneObject[]) => enclosedRegions(objects).map((region) => region.length)

describe("dragging a wall sideways", () => {
  const office = room(0, 0, 2, 2)
  const grip = findWallGrip(office, 1, 0.1) as string

  test("grabs the wall whose foot is under the cursor", () => {
    expect(office.find((object) => object.id === grip)?.z).toBe(0)
    expect(findWallGrip(office, 1, 1)).toBeNull()
  })
  test("moves the whole run, and the walls at its ends stretch: the room stays closed", () => {
    const shift = composeWallShift(office, grip, -0.5)
    expect(shift?.runIds).toHaveLength(4)
    expect(floorOf(office)).toEqual([16])
    expect(floorOf(shift?.objects ?? [])).toEqual([20])
  })
  test("shrinks the room the other way", () => {
    expect(floorOf(composeWallShift(office, grip, 0.5)?.objects ?? [])).toEqual([12])
  })
  test("won't run through furniture", () => {
    const desk = place("desk", 1, 0.5)
    expect(composeWallShift([...office, desk], grip, 0.5)).toBeNull()
  })
  test("a zero move is no move", () => {
    expect(composeWallShift(office, grip, 0)).toBeNull()
  })
})
