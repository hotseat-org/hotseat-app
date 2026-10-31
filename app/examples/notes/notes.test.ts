/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { notesModule } from "./module"
import type { NotesState } from "./store"
import { getCategories, getTiles } from "~/editor"
import { getItem } from "~/editor/core"
import { createTestEditor } from "~/editor/testing"

const createNotesEditor = () => createTestEditor<NotesState>({ modules: [notesModule] })

const runCommand = (store: ReturnType<typeof createNotesEditor>["store"], id: string) => {
  const command = notesModule.commands?.find((candidate) => candidate.id === id)
  command?.run(store.getState())
}

describe("the notes module", () => {
  test("brings its kind of piece, its look and its catalogue section", () => {
    createNotesEditor()

    expect(getItem("note").tags).toContain("note")
    expect(getTiles().some((tile) => tile.type === "note")).toBe(true)
    expect(getCategories().find((category) => category.id === "notes")?.types).toEqual(["note"])
  })

  test("selects every note at once", () => {
    const { store, place } = createNotesEditor()
    const first = place("note", { x: 0.25, z: 0.25 })
    const second = place("note", { x: 3.25, z: 0.25 })
    place("wall", { x: 1, z: 2 })

    runCommand(store, "selectNotes")

    expect(new Set(store.getState().selection)).toEqual(new Set([first, second]))
  })

  test("opens and closes its list", () => {
    const { store } = createNotesEditor()

    runCommand(store, "toggleNotesList")
    expect(store.getState().isNotesListOpen).toBe(true)

    runCommand(store, "toggleNotesList")
    expect(store.getState().isNotesListOpen).toBe(false)
  })
})
