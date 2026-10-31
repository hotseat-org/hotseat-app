/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { createTestEditor } from "../testing"
import type { SceneObject } from "../types"
import { composeSavedLayout } from "./objects"

const wall: SceneObject = { id: "wall", type: "wall", x: 0.5, z: 0, rotation: 0 }
/** A piece of an item no module here brings (one an editor with more modules saved). */
const stranger = {
  id: "stranger",
  type: "rocket",
  x: 2.25,
  z: 2.25,
  rotation: 0,
} as unknown as SceneObject

describe("a layout with pieces this editor can't show", () => {
  test("shows what it can and keeps the rest aside", () => {
    const { store } = createTestEditor({ objects: [wall, stranger] })

    expect(new Set(store.getState().objects.map((piece) => piece.type))).toEqual(new Set(["wall"]))
    expect(store.getState().keptPieces.map((piece) => piece.id)).toEqual(["stranger"])
  })

  test("saves them back with the layout", () => {
    const { store } = createTestEditor({ objects: [wall, stranger] })

    expect(composeSavedLayout(store.getState()).at(-1)?.id).toBe("stranger")
  })

  test("keeps them aside when a layout is loaded too", () => {
    const { store } = createTestEditor()

    store.getState().load([wall, stranger])

    expect(store.getState().keptPieces.map((piece) => piece.id)).toEqual(["stranger"])
  })

  test("leaves them out of a placed saved room", () => {
    const { store } = createTestEditor()

    store.getState().placeKit([stranger])

    expect(composeSavedLayout(store.getState())).toHaveLength(0)
  })
})
