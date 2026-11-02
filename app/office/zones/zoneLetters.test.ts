/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { composeLetteredZones, placeZoneLetters } from "./zoneLetters"
import { ZONE_CELL, composeZoneAreas } from "./zones"
import { type ObjectType, type SceneObject } from "~/editor/core"

let nextId = 0
const place = (type: ObjectType, spec: Pick<SceneObject, "x" | "z"> & Partial<SceneObject>) => ({
  id: `o${nextId++}`,
  type,
  rotation: 0,
  ...spec,
})

/** A row of desks along x, in a zone. */
const row = (zone: string, z: number, count: number) =>
  Array.from({ length: count }, (_, index) => place("workstation", { x: index * 2, z, zone }))

describe("zones' names on their floors", () => {
  test("are one height in an office, and fit whole within their zone's outline", () => {
    const objects = [...row("Engineering", 0, 4), ...row("Ops", 6, 2)]
    const { areas, letters } = composeLetteredZones(composeZoneAreas(objects), objects)
    const placed = [...letters.values()]

    expect(placed).toHaveLength(2)
    expect(new Set(placed.map((place) => place.height)).size).toBe(1)

    // Every square under each name is its zone's (taking in what it needs beside it), no other's.
    const zoneOf = new Map<string, string>()
    for (const area of areas)
      for (const [i, j] of area.cells) {
        expect(zoneOf.has(`${i},${j}`)).toBe(false)
        zoneOf.set(`${i},${j}`, area.zone.name)
      }
    for (const area of areas) {
      const place = letters.get(area.zone.name)!
      const [across, deep] = place.isAlongX
        ? [place.width, place.height]
        : [place.height, place.width]
      for (let x = place.x - across / 2 + 0.01; x < place.x + across / 2; x += ZONE_CELL / 2)
        for (const z of [place.z - deep / 2 + 0.01, place.z + deep / 2 - 0.01]) {
          const owner = zoneOf.get(`${Math.floor(x / ZONE_CELL)},${Math.floor(z / ZONE_CELL)}`)
          expect(owner).toBe(area.zone.name)
        }
    }
  })

  test("stay their side of a wall", () => {
    // Walls close in front of and behind the desks: no room inside, and its
    // name can't reach past them.
    const desks = row("Engineering", 0, 4)
    const walls = [-1, 1].flatMap((z) =>
      Array.from({ length: 24 }, (_, index) => place("wall", { x: -1.75 + index * 0.5, z }))
    )
    const objects = [...desks, ...walls]
    const { areas } = composeLetteredZones(composeZoneAreas(objects), objects)
    const isAlongWalls = ([i]: [number, number]) => i * ZONE_CELL >= -2 && i * ZONE_CELL < 10
    const isBetweenWalls = ([, j]: [number, number]) => j * ZONE_CELL >= -1 && j * ZONE_CELL < 1

    expect(areas[0].cells.filter(isAlongWalls).every(isBetweenWalls)).toBe(true)
  })

  test("keep clear of desks, and run along x where they can", () => {
    const objects = row("Engineering", 0, 4)
    const [area] = composeZoneAreas(objects)
    const place = placeZoneLetters([area], objects).get("Engineering")!

    expect(place.isAlongX).toBe(true)
    // A desk stands a metre either side of its row's line: the name isn't on it.
    expect(Math.abs(place.z)).toBeGreaterThan(0.5)
  })

  test("aren't lettered where they can't fit whole by their zone", () => {
    const name = "A name far, far longer than its one desk's zone could ever hold"
    const objects = [place("workstation", { x: 0, z: 0, zone: name })]
    const areas = composeZoneAreas(objects)

    expect(placeZoneLetters(areas, objects).size).toBe(0)
  })
})
