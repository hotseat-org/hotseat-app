/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { roomEdges } from "../layout"
import { createTestEditor } from "../testing"
import type { SceneObject } from "../types"
import { composeSavedLayout } from "./objects"

const wall: SceneObject = { id: "wall", type: "wall", x: 0.5, z: 0, rotation: 0 }
// One unit of wall, as the editor keeps them (see normalizeEdges).
const otherWall: SceneObject = { id: "other", type: "wall", x: 0.25, z: 4, rotation: 0 }

/** An editor with `wall` on the first floor and `otherWall` on a second, shown. */
const createTwoFloors = () => {
  const editor = createTestEditor({ objects: [wall] })
  const { addFloor, beginBatch, endBatch } = editor.store.getState()
  addFloor()
  beginBatch()
  editor.store.setState({ objects: [otherWall] })
  endBatch()

  return editor
}

/** The floors of the pieces at `z` (a wall is saved as its one-unit segments). */
const getFloorsAt = (pieces: SceneObject[], z: number) => [
  ...new Set(pieces.filter((piece) => piece.z === z).map((piece) => piece.floor)),
]
/** Where the pieces stand (the walls, by their z). */
const getRows = (pieces: SceneObject[]) => [...new Set(pieces.map((piece) => piece.z))]

describe("floors", () => {
  test("a new floor is shown, empty, with the first floor's pieces aside", () => {
    const { store } = createTestEditor({ objects: [wall] })

    store.getState().addFloor()

    const { floors, currentFloor, objects, otherFloorsPieces } = store.getState()
    expect(floors).toHaveLength(2)
    expect(currentFloor).toBe(floors[1].id)
    expect(objects).toHaveLength(0)
    expect(getRows(otherFloorsPieces)).toEqual([wall.z])
  })

  test("a floor above another starts with its outer walls, between it and the next", () => {
    const room = roomEdges({ x: 0, z: 0 }, { x: 2, z: 2 }).map(
      (edge, index): SceneObject => ({ id: `room-${index}`, type: "wall", ...edge })
    )
    const desk: SceneObject = { id: "desk", type: "desk", x: 1, z: 1, rotation: 0 }
    const { store } = createTestEditor({ objects: [...room, desk] })
    store.getState().addFloor()
    const [ground, top] = store.getState().floors

    store.getState().addFloorAbove(ground.id, true)

    const { floors, currentFloor, objects } = store.getState()
    expect(floors.map((floor) => floor.id)).toEqual([ground.id, currentFloor, top.id])
    expect(objects).toHaveLength(room.length)
    expect(objects.every((piece) => piece.type === "wall")).toBe(true)
  })

  test("each piece is saved on its floor", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()

    const { pieces } = composeSavedLayout(store.getState())

    expect(getFloorsAt(pieces, wall.z)).toEqual([floors[0].id])
    expect(getFloorsAt(pieces, otherWall.z)).toEqual([floors[1].id])
  })

  test("showing another floor swaps the pieces and forgets the undo steps", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()

    store.getState().showFloor(floors[0].id)

    expect(getRows(store.getState().objects)).toEqual([wall.z])
    expect(store.getState().past).toHaveLength(0)
  })

  test("showing another floor and back saves the same layout", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()
    const before = JSON.stringify(composeSavedLayout(store.getState()))

    store.getState().showFloor(floors[0].id)
    store.getState().showFloor(floors[1].id)

    expect(JSON.stringify(composeSavedLayout(store.getState()))).toBe(before)
  })

  test("a floor shown again unchanged has the very same pieces", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()
    const shown = store.getState().objects

    store.getState().showFloor(floors[0].id)
    store.getState().showFloor(floors[1].id)

    expect(store.getState().objects).toBe(shown)
  })

  test("a floor changed elsewhere is shown as it is now", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()
    store.getState().showFloor(floors[0].id)
    const shown = store.getState().objects

    store.getState().showFloor(floors[1].id)
    store.setState({
      otherFloorsPieces: store
        .getState()
        .otherFloorsPieces.map((piece) =>
          piece.floor === floors[0].id ? { ...piece, z: 2 } : piece
        ),
    })
    store.getState().showFloor(floors[0].id)

    expect(store.getState().objects).not.toBe(shown)
    expect(getRows(store.getState().objects)).toEqual([2])
  })

  test("a deleted floor takes its pieces; the last floor's carry none again", () => {
    const { store } = createTwoFloors()
    const { floors } = store.getState()

    store.getState().deleteFloor(floors[1].id)

    const { pieces } = composeSavedLayout(store.getState())
    expect(store.getState().floors).toHaveLength(1)
    expect(getRows(pieces)).toEqual([wall.z])
    expect(getFloorsAt(pieces, wall.z)).toEqual([undefined])
  })

  test("the last floor can't be deleted", () => {
    const { store } = createTestEditor({ objects: [wall] })

    store.getState().deleteFloor(store.getState().currentFloor)

    expect(store.getState().floors).toHaveLength(1)
    expect(getRows(store.getState().objects)).toEqual([wall.z])
  })

  test("a floor is renamed, trimmed", () => {
    const { store } = createTwoFloors()
    const [first, second] = store.getState().floors

    store.getState().renameFloor(second.id, "  Attic  ")

    expect(store.getState().floors.map((floor) => floor.name)).toEqual([first.name, "Attic"])
  })
})
