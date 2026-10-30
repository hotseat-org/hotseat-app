/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import type { ObjectType, SceneObject, WallCell } from "../types"
import {
  composeWallColors,
  edgeDirection,
  enclosedRegions,
  footprintCells,
  furnitureCollides,
  isDiagonal,
  mountWalls,
  normalizeEdges,
  openingPlan,
  paintWallFaces,
  roomEdges,
  snapToFootprint,
  toRotationStep,
  wallJointNodes,
  wallMount,
  wallRun,
} from "."

let nextId = 0
const place = (type: ObjectType, x: number, z: number, rotation = 0): SceneObject => ({
  id: `o${nextId++}`,
  type,
  x,
  z,
  rotation,
})
const walls = (cells: WallCell[], type: ObjectType = "wall") =>
  cells.map((cell) => place(type, cell.x, cell.z, cell.rotation))
/** A closed rectangle of walls between two grid nodes. */
const room = (x0: number, z0: number, x1: number, z1: number) =>
  walls(roomEdges({ x: x0, z: z0 }, { x: x1, z: z1 }))
const cellCount = (regions: { parts?: number }[][]) => regions.map((region) => region.length)
const QUARTER = Math.PI / 2

describe("rotation", () => {
  test("snaps to the nearest 45° step in [0, 2π)", () => {
    expect(toRotationStep(0.1)).toBe(0)
    expect(toRotationStep(-QUARTER)).toBeCloseTo(3 * QUARTER)
    expect(toRotationStep(2 * Math.PI)).toBe(0)
  })
  test("tells diagonal turns from quarter turns", () => {
    expect(isDiagonal(Math.PI / 4)).toBe(true)
    expect(isDiagonal(QUARTER)).toBe(false)
  })
})

describe("footprint", () => {
  test("swaps its sides on a quarter turn", () => {
    expect(footprintCells("desk", 0)).toEqual([4, 2])
    expect(footprintCells("desk", QUARTER)).toEqual([2, 4])
  })
  test("takes the square a diagonal piece fits in", () => {
    expect(footprintCells("desk", Math.PI / 4)).toEqual([5, 5])
  })
  test("a piece turned full circle ends where it started", () => {
    let position = snapToFootprint("toilet", 0, 0.3, 0.3)
    const start = position
    for (let i = 1; i <= 4; i++)
      position = snapToFootprint("toilet", i * QUARTER, position.x, position.z)
    expect(position).toEqual(start)
  })
})

describe("wall runs", () => {
  test("a click lays one segment", () => {
    expect(wallRun({ x: 0, z: 0 }, { x: 0, z: 0 })).toHaveLength(1)
  })
  test("a straight drag lays one segment per half metre", () => {
    const run = wallRun({ x: 0, z: 0 }, { x: 2, z: 0 })
    expect(run).toHaveLength(4)
    expect(run.every((edge) => edgeDirection(edge.rotation) === "x")).toBe(true)
  })
  test("a drag off both axes turns one corner", () => {
    const run = wallRun({ x: 0, z: 0 }, { x: 3, z: 1 })
    expect(run).toHaveLength(8)
    expect(new Set(run.map((edge) => edgeDirection(edge.rotation)))).toEqual(new Set(["x", "z"]))
  })
  test("a drag near 45° runs diagonally", () => {
    const run = wallRun({ x: 0, z: 0 }, { x: 1, z: 1 })
    expect(run).toHaveLength(2)
    expect(run.every((edge) => edgeDirection(edge.rotation) === "rising")).toBe(true)
  })
  test("the room tool lays the rectangle's four sides", () => {
    expect(roomEdges({ x: 0, z: 0 }, { x: 2, z: 1 })).toHaveLength(12)
  })
})

describe("rooms", () => {
  test("a closed rectangle is one room, its whole floor", () => {
    expect(cellCount(enclosedRegions(room(0, 0, 2, 1)))).toEqual([8])
  })
  test("a gap leaves no room", () => {
    const open = room(0, 0, 2, 1).slice(1)
    expect(enclosedRegions(open)).toEqual([])
  })
  test("a partition makes two rooms", () => {
    const split = [...room(0, 0, 2, 1), ...walls(wallRun({ x: 1, z: 0 }, { x: 1, z: 1 }))]
    expect(cellCount(enclosedRegions(split)).sort()).toEqual([4, 4])
  })
  test("a door still closes a room", () => {
    const objects = room(0, 0, 2, 1)
    const wall = objects.find((segment) => segment.z === 0 && segment.x === 0.75) as SceneObject
    const plan = openingPlan(objects, wall.id, "door", 0.8, 0) as NonNullable<
      ReturnType<typeof openingPlan>
    >
    const withDoor = [
      ...objects.filter((object) => !plan.remove.includes(object.id)),
      ...plan.add.map((object, i) => ({ ...object, id: `door${i}` })),
    ]
    expect(cellCount(enclosedRegions(withDoor))).toEqual([8])
  })
  test("glass walls close rooms too", () => {
    const glass = walls(roomEdges({ x: 0, z: 0 }, { x: 1, z: 1 }), "glassWall")
    expect(cellCount(enclosedRegions(glass))).toEqual([4])
  })
  test("a diagonal wall cuts squares in half", () => {
    // A triangle: two sides along the axes, the third corner to corner.
    const triangle = [
      ...walls(wallRun({ x: 0, z: 0 }, { x: 1, z: 0 })),
      ...walls(wallRun({ x: 0, z: 0 }, { x: 0, z: 1 })),
      ...walls(wallRun({ x: 0, z: 1 }, { x: 1, z: 0 })),
    ]
    const [region] = enclosedRegions(triangle)
    expect(region.some((cell) => cell.parts !== undefined)).toBe(true)
  })
})

describe("collisions", () => {
  const office = room(0, 0, 4, 4)
  test("furniture can't overlap furniture", () => {
    const desk = place("desk", 1, 1)
    expect(furnitureCollides([...office, desk], "desk", 1.5, 1, 0)).toBe(true)
  })
  test("but may stand flush against it", () => {
    const desk = place("desk", 1, 1)
    expect(furnitureCollides([...office, desk], "desk", 3, 1, 0)).toBe(false)
  })
  test("furniture can't straddle a wall, but may touch it", () => {
    expect(furnitureCollides(office, "desk", 1, 0, 0)).toBe(true)
    expect(furnitureCollides(office, "desk", 1, 0.5, 0)).toBe(false)
  })
  test("a rug goes under furniture", () => {
    const desk = place("desk", 2, 2)
    expect(furnitureCollides([...office, desk], "rug", 2, 2, 0)).toBe(false)
  })
  test("ceiling lights only bump into ceiling lights", () => {
    const desk = place("desk", 2, 2)
    expect(furnitureCollides([...office, desk], "ceilingLight", 2, 2, 0)).toBe(false)
    const light = place("ceilingLight", 2, 2)
    expect(furnitureCollides([...office, light], "ceilingLight", 2, 2, 0)).toBe(true)
  })
})

describe("wall items", () => {
  const office = room(0, 0, 4, 4)
  test("hang against the nearest wall, facing the cursor's side", () => {
    expect(wallMount(office, "wallArt", 1.1, 0.3)).toEqual({ x: 1, z: 0.25, rotation: 0 })
  })
  test("need solid wall behind their whole width", () => {
    expect(mountWalls(office, "wallArt", 1, 0.25, 0)).toHaveLength(2)
    expect(mountWalls(office, "wallArt", 1, 2, 0)).toBeNull()
    expect(furnitureCollides(office, "wallArt", 1, 2, 0)).toBe(true)
  })
})

describe("openings", () => {
  test("a door takes two wall halves, and gives them back", () => {
    const objects = room(0, 0, 2, 2)
    const wall = objects.find((segment) => segment.z === 0 && segment.x === 0.75) as SceneObject
    const cut = openingPlan(objects, wall.id, "door", 0.8, 0)
    expect(cut?.remove).toHaveLength(2)
    expect(cut?.add).toEqual([{ type: "door", x: 1, z: 0, rotation: 0 }])
    const door = place("door", 1, 0)
    const filled = openingPlan([...objects, door], door.id, "door")
    expect(filled?.add.map((object) => object.type)).toEqual(["wall", "wall"])
  })
  test("a window needs solid wall: none in glass", () => {
    const glass = walls(roomEdges({ x: 0, z: 0 }, { x: 2, z: 2 }), "glassWall")
    const wall = glass.find((segment) => segment.z === 0 && segment.x === 0.75) as SceneObject
    expect(openingPlan(glass, wall.id, "window", 0.8, 0)).toBeNull()
    expect(openingPlan(glass, wall.id, "door", 0.8, 0)?.add[0]).toMatchObject({
      type: "door",
      model: "glass",
    })
  })
})

describe("wall paint", () => {
  test("a window shows the paint of the wall round it", () => {
    const line = walls(wallRun({ x: 0, z: 0 }, { x: 3, z: 0 }))
    const window = place("window", 1.5, 0)
    const objects = [...line.filter((object) => object.x !== 1.25 && object.x !== 1.75), window]
    const painted = paintWallFaces(
      objects,
      objects
        .filter((object) => object.type === "wall")
        .map((object) => ({ id: object.id, face: "front" as const })),
      "#ff0000"
    )
    expect(composeWallColors(painted).openings.get(window.id)).toEqual(["#ff0000", undefined])
  })
  test("corner posts stand where walls running different ways meet", () => {
    expect(wallJointNodes(room(0, 0, 1, 1))).toHaveLength(4)
    expect(wallJointNodes(walls(wallRun({ x: 0, z: 0 }, { x: 2, z: 0 })))).toEqual([])
  })
})

describe("saved layouts", () => {
  test("old 1-unit walls become two halves, once", () => {
    const old = [place("wall", 1, 0)]
    const upgraded = normalizeEdges(old)
    expect(upgraded.map((object) => object.x)).toEqual([0.75, 1.25])
    expect(normalizeEdges(upgraded)).toBe(upgraded)
  })
})

describe("fences", () => {
  const fenced = walls(roomEdges({ x: 0, z: 0 }, { x: 4, z: 4 }), "fence")
  test("don't make rooms", () => {
    expect(enclosedRegions(fenced)).toEqual([])
  })
  test("block furniture like walls do", () => {
    expect(furnitureCollides(fenced, "desk", 1, 0, 0)).toBe(true)
    expect(furnitureCollides(fenced, "desk", 1, 0.5, 0)).toBe(false)
  })
  test("take no door, and nothing hangs on them", () => {
    const segment = fenced.find((object) => object.z === 0 && object.x === 0.75) as SceneObject
    expect(openingPlan(fenced, segment.id, "door", 0.8, 0)).toBeNull()
    expect(wallMount(fenced, "wallArt", 1.1, 0.3)).toBeNull()
  })
})
