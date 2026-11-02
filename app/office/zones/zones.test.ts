/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { composeZoneAreas, getZones, numberDesksByZone } from "./zones"
import { roomEdges } from "~/editor/core"
import { type ObjectType, type SceneObject } from "~/editor/core"

let nextId = 0
const place = (type: ObjectType, spec: Pick<SceneObject, "x" | "z"> & Partial<SceneObject>) => ({
  id: `o${nextId++}`,
  type,
  rotation: 0,
  ...spec,
})
const wallsAlong = (cells: { x: number; z: number; rotation: number }[]) =>
  cells.map((cell) => place("wall", cell))

describe("zones", () => {
  test("are listed by name, with how many desks each has", () => {
    const zones = getZones([
      place("workstation", { x: 0, z: 0, zone: "Sales" }),
      place("workstation", { x: 4, z: 0, zone: "Eng" }),
      place("workstation", { x: 8, z: 0, zone: "Eng" }),
      place("plant", { x: 0, z: 4, zone: "Eng" }),
    ])
    expect(zones.map((zone) => [zone.name, zone.deskCount])).toEqual([
      ["Eng", 2],
      ["Sales", 1],
    ])
  })
  test("keep their colour as other zones come and go", () => {
    const eng = place("workstation", { x: 0, z: 0, zone: "Eng" })
    const alone = getZones([eng])[0].color
    const withOthers = getZones([eng, place("workstation", { x: 4, z: 0, zone: "Ops" })])
    expect(withOthers.find((zone) => zone.name === "Eng")?.color).toBe(alone)
  })
  test("number their desks after the zone, the rest D-1…", () => {
    const labels = numberDesksByZone([
      place("workstation", { x: 0, z: 0, zone: "Účetnictví" }),
      place("workstation", { x: 4, z: 0, zone: "Účetnictví" }),
      place("workstation", { x: 8, z: 0 }),
    ]).map((desk) => desk.label)
    expect(labels).toEqual(["UCE-1", "UCE-2", "D-1"])
  })
  test("spread over the floor round their desks, but not through a wall", () => {
    // A desk with its back to the room's wall at z = 0: the zone's margin
    // reaches past that line only where there's no wall.
    const desk = place("workstation", { x: 2, z: 0.75, zone: "Eng" })
    const reachesPast = (objects: SceneObject[]) =>
      composeZoneAreas(objects)[0].cells.some(([, j]) => j < 0)
    expect(reachesPast([desk])).toBe(true)
    expect(reachesPast([desk, ...wallsAlong(roomEdges({ x: 0, z: 0 }, { x: 4, z: 4 }))])).toBe(
      false
    )
  })
  test("never spread under a desk of another zone", () => {
    const areas = composeZoneAreas([
      place("workstation", { x: 0, z: 0, zone: "Eng" }),
      place("workstation", { x: 2, z: 0, zone: "Ops" }),
    ])
    const [eng, ops] = areas.map((area) => new Set(area.cells.map(([i, j]) => `${i},${j}`)))
    expect([...eng].some((key) => ops.has(key))).toBe(false)
  })
  test("letter their name on their floor away from desks, along their longer side", () => {
    // A row of three desks along x: the name runs along x, off the desks' line.
    const [area] = composeZoneAreas([
      place("workstation", { x: 0, z: 0, zone: "Eng" }),
      place("workstation", { x: 2, z: 0, zone: "Eng" }),
      place("workstation", { x: 4, z: 0, zone: "Eng" }),
    ])
    const deskDistance = Math.min(
      ...[0, 2, 4].map((x) => Math.hypot(area.floorLabel.x - x, area.floorLabel.z))
    )

    expect(area.floorLabel.isAlongX).toBe(true)
    expect(deskDistance).toBeGreaterThan(0.5)
    expect(area.floorLabel.maxWidth).toBeGreaterThan(4)
  })
  test("put their name at their back edge, in its middle", () => {
    const [area] = composeZoneAreas([
      place("workstation", { x: 0, z: 2, zone: "Eng" }),
      place("workstation", { x: 4, z: 2, zone: "Eng" }),
    ])
    const backEdge = Math.min(...area.cells.map(([, j]) => j))

    expect(area.edgeLabel.z).toBeLessThan(2)
    expect(area.edgeLabel.z).toBeCloseTo(backEdge * 0.5, 5)
    expect(area.edgeLabel.x).toBeGreaterThan(0)
    expect(area.edgeLabel.x).toBeLessThan(4)
  })
})

describe("zones and fences", () => {
  test("a zone carries on past a fence (it isn't a wall)", () => {
    const desk = place("workstation", { x: 2, z: 0.75, zone: "Eng" })
    const fence = roomEdges({ x: 0, z: 0 }, { x: 4, z: 4 }).map((edge) =>
      place("fence", { x: edge.x, z: edge.z, rotation: edge.rotation })
    )
    expect(composeZoneAreas([desk, ...fence])[0].cells.some(([, j]) => j < 0)).toBe(true)
  })
})
