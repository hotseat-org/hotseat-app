/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { roomEdges } from "../layout"
import type { ObjectType, SceneObject } from "../types"
import { composeZoneAreas, getZones, numberDesksByZone } from "./zones"

let nextId = 0
const place = (type: ObjectType, x: number, z: number, extra: Partial<SceneObject> = {}) => ({
  id: `o${nextId++}`,
  type,
  x,
  z,
  rotation: 0,
  ...extra,
})
const wallsAlong = (cells: { x: number; z: number; rotation: number }[]) =>
  cells.map((cell) => place("wall", cell.x, cell.z, { rotation: cell.rotation }))

describe("zones", () => {
  test("are listed by name, with how many desks each has", () => {
    const zones = getZones([
      place("workstation", 0, 0, { zone: "Sales" }),
      place("workstation", 4, 0, { zone: "Eng" }),
      place("workstation", 8, 0, { zone: "Eng" }),
      place("plant", 0, 4, { zone: "Eng" }),
    ])
    expect(zones.map((zone) => [zone.name, zone.deskCount])).toEqual([
      ["Eng", 2],
      ["Sales", 1],
    ])
  })
  test("keep their colour as other zones come and go", () => {
    const eng = place("workstation", 0, 0, { zone: "Eng" })
    const alone = getZones([eng])[0].color
    const withOthers = getZones([eng, place("workstation", 4, 0, { zone: "Ops" })])
    expect(withOthers.find((zone) => zone.name === "Eng")?.color).toBe(alone)
  })
  test("number their desks after the zone, the rest D-1…", () => {
    const labels = numberDesksByZone([
      place("workstation", 0, 0, { zone: "Účetnictví" }),
      place("workstation", 4, 0, { zone: "Účetnictví" }),
      place("workstation", 8, 0),
    ]).map((desk) => desk.label)
    expect(labels).toEqual(["UCE-1", "UCE-2", "D-1"])
  })
  test("spread over the floor round their desks, but not through a wall", () => {
    // A desk with its back to the room's wall at z = 0: the zone's margin
    // reaches past that line only where there's no wall.
    const desk = place("workstation", 2, 0.75, { zone: "Eng" })
    const reachesPast = (objects: SceneObject[]) =>
      composeZoneAreas(objects)[0].cells.some(([, j]) => j < 0)
    expect(reachesPast([desk])).toBe(true)
    expect(reachesPast([desk, ...wallsAlong(roomEdges({ x: 0, z: 0 }, { x: 4, z: 4 }))])).toBe(
      false
    )
  })
  test("never spread under a desk of another zone", () => {
    const areas = composeZoneAreas([
      place("workstation", 0, 0, { zone: "Eng" }),
      place("workstation", 2, 0, { zone: "Ops" }),
    ])
    const [eng, ops] = areas.map((area) => new Set(area.cells.map(([i, j]) => `${i},${j}`)))
    expect([...eng].some((key) => ops.has(key))).toBe(false)
  })
})

describe("zones and fences", () => {
  test("a zone carries on past a fence (it isn't a wall)", () => {
    const desk = place("workstation", 2, 0.75, { zone: "Eng" })
    const fence = roomEdges({ x: 0, z: 0 }, { x: 4, z: 4 }).map((edge) =>
      place("fence", edge.x, edge.z, { rotation: edge.rotation })
    )
    expect(composeZoneAreas([desk, ...fence])[0].cells.some(([, j]) => j < 0)).toBe(true)
  })
})
