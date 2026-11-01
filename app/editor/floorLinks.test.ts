/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { createTestEditor } from "./testing"
import { getStairsDestination } from "./useFloorLinkClick"
import type { SceneObject } from "./types"

const stairsOn = (id: string): SceneObject => ({ id, type: "stairs", x: 2, z: 4, rotation: 0 })

describe("pressing stairs", () => {
  test("goes up from their own floor and down from their opening — on any floor", () => {
    const { store } = createTestEditor({ objects: [stairsOn("from-ground")] })
    store.getState().addFloor()
    store.getState().addFloor()
    const [ground, first, second] = store.getState().floors

    // The first floor shown, with stairs of its own up to the second.
    store.getState().showFloor(first.id)
    store.setState({ objects: [stairsOn("from-first")] })
    const state = store.getState()
    const fromGround = state.otherFloorsPieces.find((piece) => piece.id === "from-ground")!

    expect(getStairsDestination(state, state.objects[0])).toBe(second.id)
    expect(getStairsDestination(state, fromGround)).toBe(ground.id)
  })
})
