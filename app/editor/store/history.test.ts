/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
// The office's furniture serves as the test pieces.
import "~/office/catalog"
import { createEditorStore } from "./createEditorStore"
import { HISTORY_LIMIT } from "./history"

const createStoreWithPlant = () => {
  const store = createEditorStore()
  const id = store.getState().addObject({ type: "plant", x: 0.25, z: 0.25 })

  return { store, id }
}

const positionOf = (store: ReturnType<typeof createEditorStore>, id: string) => {
  const piece = store.getState().objects.find((candidate) => candidate.id === id)

  return piece && { x: piece.x, z: piece.z }
}

describe("undo and redo", () => {
  test("every change to the layout is one step back and forth", () => {
    const { store, id } = createStoreWithPlant()
    store.getState().moveObject(id, { x: 2.25, z: 0.25 })

    store.getState().undo()
    expect(positionOf(store, id)).toEqual({ x: 0.25, z: 0.25 })

    store.getState().undo()
    expect(store.getState().objects).toHaveLength(0)

    store.getState().redo()
    store.getState().redo()
    expect(positionOf(store, id)).toEqual({ x: 2.25, z: 0.25 })
  })

  test("a new change after undoing drops what could be redone", () => {
    const { store, id } = createStoreWithPlant()
    store.getState().moveObject(id, { x: 2.25, z: 0.25 })
    store.getState().undo()

    store.getState().moveObject(id, { x: 0.25, z: 2.25 })

    expect(store.getState().future).toHaveLength(0)
  })

  test("what doesn't touch the layout leaves no step", () => {
    const { store, id } = createStoreWithPlant()
    const steps = store.getState().past.length

    store.getState().select(id)
    store.getState().setTool("wall")

    expect(store.getState().past).toHaveLength(steps)
  })

  test("keeps the last hundred steps", () => {
    const { store, id } = createStoreWithPlant()
    for (let step = 1; step <= HISTORY_LIMIT + 20; step++)
      store.getState().moveObject(id, { x: 0.25 + step * 0.5, z: 0.25 })

    expect(store.getState().past).toHaveLength(HISTORY_LIMIT)
  })

  test("the selection lets go of a piece undone out of existence", () => {
    const { store, id } = createStoreWithPlant()
    store.getState().select(id)

    store.getState().undo()

    expect(store.getState().selectedId).toBeNull()
  })

  test("the selection stays on a piece that still exists", () => {
    const { store, id } = createStoreWithPlant()
    store.getState().moveObject(id, { x: 2.25, z: 0.25 })
    store.getState().select(id)

    store.getState().undo()

    expect(store.getState().selectedId).toBe(id)
  })
})

describe("a batch (carrying a piece)", () => {
  test("is one step, however many moves it makes", () => {
    const { store, id } = createStoreWithPlant()
    const steps = store.getState().past.length

    store.getState().beginBatch()
    for (const x of [1.25, 2.25, 3.25]) store.getState().moveObject(id, { x, z: 0.25 })
    store.getState().endBatch()

    expect(store.getState().past).toHaveLength(steps + 1)
    store.getState().undo()
    expect(positionOf(store, id)).toEqual({ x: 0.25, z: 0.25 })
  })

  test("put back where it started leaves no step", () => {
    const { store, id } = createStoreWithPlant()
    const steps = store.getState().past.length

    store.getState().beginBatch()
    store.getState().moveObject(id, { x: 2.25, z: 0.25 })
    store.getState().moveObject(id, { x: 0.25, z: 0.25 })
    store.getState().endBatch()

    expect(store.getState().past).toHaveLength(steps)
  })

  test("can't be undone halfway", () => {
    const { store, id } = createStoreWithPlant()

    store.getState().beginBatch()
    store.getState().moveObject(id, { x: 2.25, z: 0.25 })
    store.getState().undo()

    expect(positionOf(store, id)).toEqual({ x: 2.25, z: 0.25 })
    store.getState().endBatch()
  })
})

describe("a turn into other pieces", () => {
  test("is refused when let go, and leaves no step", () => {
    const store = createEditorStore()
    const sofa = store.getState().addObject({ type: "sofa", x: 0, z: 0.25 })
    // Right beside the sofa's back, where its end swings when it turns.
    store.getState().addObject({ type: "plant", x: 0.25, z: 1.25 })
    const steps = store.getState().past.length
    const before = store.getState().objects.find((piece) => piece.id === sofa)

    store.getState().select(sofa)
    store.getState().rotateObject(sofa)
    expect(store.getState().pendingTurn).not.toBeNull()
    store.getState().select(null)

    const after = store.getState().objects.find((piece) => piece.id === sofa)
    expect(after?.rotation).toBe(before?.rotation)
    expect(store.getState().past).toHaveLength(steps)
  })
})
