/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
// The office's furniture serves as the test pieces.
import "~/office/catalog"
import type { SceneObject } from "../types"
import { composeOuterWalls, openingPlan, roomEdges, wallRun } from "."

let nextId = 0
const toPieces = (pieces: Omit<SceneObject, "id">[]): SceneObject[] =>
  pieces.map((piece) => ({ id: `o${nextId++}`, ...piece }))

/** A 4 × 3 m room split in two by a wall at x = 2, a desk in it. */
const composeBuilding = () =>
  toPieces([
    ...roomEdges({ x: 0, z: 0 }, { x: 4, z: 3 }).map((edge) => ({
      type: "wall" as const,
      ...edge,
    })),
    ...wallRun({ x: 2, z: 0 }, { x: 2, z: 3 }).map((edge) => ({ type: "wall" as const, ...edge })),
    { type: "desk", x: 1, z: 1, rotation: 0 },
  ])

describe("composeOuterWalls", () => {
  test("keeps the walls round the outside, not the one between the rooms nor the furniture", () => {
    const outer = composeOuterWalls(composeBuilding())

    // The outline: 2 × (4 m + 3 m) of half-metre walls.
    expect(outer).toHaveLength(28)
    expect(outer.every((piece) => piece.type === "wall")).toBe(true)
    expect(outer.some((piece) => piece.x === 2 && piece.z > 0 && piece.z < 3)).toBe(false)
  })

  test("fills an outer door in with wall, and keeps a window", () => {
    const building = composeBuilding()
    const cutOpening = (pieces: SceneObject[], kind: "door" | "window", x: number) => {
      const wall = pieces.find((piece) => piece.z === 0 && piece.x === x)!
      const plan = openingPlan(pieces, { id: wall.id, kind })!

      return [...pieces.filter((piece) => !plan.remove.includes(piece.id)), ...toPieces(plan.add)]
    }
    const withOpenings = cutOpening(cutOpening(building, "door", 0.75), "window", 3.25)

    const outer = composeOuterWalls(withOpenings)

    expect(outer.filter((piece) => piece.type === "door")).toHaveLength(0)
    expect(outer.filter((piece) => piece.type === "window")).toHaveLength(1)
    // The door's two halves back as wall, the window's two as one window.
    expect(outer).toHaveLength(27)
  })
})
