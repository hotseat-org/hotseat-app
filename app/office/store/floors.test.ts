/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { officeModule } from "../module"
import type { OfficeState } from "./index"
import type { SceneObject } from "~/editor/core"
import { createTestEditor } from "~/editor/testing"

const desk: SceneObject = { id: "desk", type: "workstation", x: 2, z: 2, rotation: 0 }

/** An office with `desk` on the first floor, and a second floor shown. */
const createTwoFloorOffice = () => {
  const editor = createTestEditor<OfficeState>({ modules: [officeModule], objects: [desk] })
  editor.store.getState().addFloor()

  return editor
}

describe("a desk on another floor", () => {
  test("found: its floor is shown", () => {
    const { store } = createTwoFloorOffice()
    const [first] = store.getState().floors

    store.getState().spotlightSeat(desk.id)

    expect(store.getState().currentFloor).toBe(first.id)
    expect(store.getState().objects.some((piece) => piece.id === desk.id)).toBe(true)
  })

  test("the way to it: its floor is shown", () => {
    const { store } = createTwoFloorOffice()
    const [first] = store.getState().floors

    store.getState().showRoute(desk.id)

    expect(store.getState().currentFloor).toBe(first.id)
    expect(store.getState().route?.deskId).toBe(desk.id)
  })

  test("its card: its floor is shown", () => {
    const { store } = createTwoFloorOffice()
    const [first] = store.getState().floors

    store.getState().openSeatCard(desk.id)

    expect(store.getState().currentFloor).toBe(first.id)
    expect(store.getState().seatCard?.id).toBe(desk.id)
  })
})
