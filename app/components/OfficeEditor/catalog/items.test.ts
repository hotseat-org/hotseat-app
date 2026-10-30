/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { ITEMS, canHost, getEdge, getItem, type ObjectType } from "./items"

describe("the catalogue", () => {
  test("walls, glass, doors and windows all close rooms", () => {
    for (const type of ["wall", "glassWall", "door", "glassDoor", "window"] as const)
      expect(getEdge(type)?.encloses).toBe(true)
  })
  test("people walk through doors, not walls or windows", () => {
    expect(getEdge("door")?.isPassable).toBe(true)
    expect(getEdge("glassDoor")?.isPassable).toBe(true)
    expect(getEdge("window")?.isPassable).toBe(false)
    expect(getEdge("wall")?.isPassable).toBe(false)
  })
  test("a wall takes any opening; glass takes doors but no window", () => {
    expect(canHost("wall", "window")).toBe(true)
    expect(canHost("glassWall", "door")).toBe(true)
    expect(canHost("glassWall", "window")).toBe(false)
  })
  test("only openings are cut into runs, and every opening a run hosts is an opening", () => {
    for (const type of Object.keys(ITEMS) as ObjectType[])
      for (const opening of getEdge(type)?.hosts ?? [])
        expect(getEdge(opening as ObjectType)?.role).toBe("opening")
  })
  test("edge traits belong to edge pieces only", () => {
    for (const type of Object.keys(ITEMS) as ObjectType[])
      expect(getItem(type).edge !== undefined).toBe(getItem(type).mount === "edge")
  })
})
