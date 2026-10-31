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
  test("brings its item, with its looks, and its catalogue section", () => {
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

  test("shows and hides the notes", () => {
    const { store, place } = createNotesEditor()
    place("note", { x: 0.25, z: 0.25 })
    expect(store.getState().layers.notes).toBe(true)

    runCommand(store, "toggleNotes")
    expect(store.getState().layers.notes).toBe(false)

    runCommand(store, "toggleNotes")
    expect(store.getState().layers.notes).toBe(true)
  })

  test("keeps what's written on a note as one step back", () => {
    const { store, place } = createNotesEditor()
    const note = place("note", { x: 0.25, z: 0.25 })
    const steps = store.getState().past.length

    store.getState().setNoteText(note, "  Water the plants  ")

    const written = store.getState().objects.find((piece) => piece.id === note)
    expect(written?.noteText).toBe("Water the plants")
    expect(store.getState().past).toHaveLength(steps + 1)

    store.getState().undo()
    expect(store.getState().objects.find((piece) => piece.id === note)?.noteText).toBeUndefined()
  })

  test("leaves no step when the text doesn't change", () => {
    const { store, place } = createNotesEditor()
    const note = place("note", { x: 0.25, z: 0.25 })
    store.getState().setNoteText(note, "Same")
    const steps = store.getState().past.length

    store.getState().setNoteText(note, "Same ")

    expect(store.getState().past).toHaveLength(steps)
  })
})
