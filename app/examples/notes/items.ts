import { z } from "zod"
import { defineItem, hasTag, registerItems, type SceneObject } from "~/editor/core"

/**
 * The notes' half the server needs, without three.js: what a note is, and
 * what it keeps on its piece. How it looks is in looks.tsx.
 */

/** A note pinned to the floor: a reminder left on the layout. */
export const NOTE_ITEMS = {
  note: defineItem({ mount: "floor", footprint: [1, 1], defaultColor: "#f2c94c", tags: ["note"] }),
}

/** The longest note (characters). */
export const MAX_NOTE_LENGTH = 280

/** What a note keeps on its piece, as the server checks it before saving. */
export const NOTE_FIELDS = {
  noteText: z.string().max(MAX_NOTE_LENGTH).optional(),
}

// An item joins the layout's types, and its field the pieces' fields: saved
// layouts and the server know them too.
type NoteItems = typeof NOTE_ITEMS
declare module "~/editor/catalog/registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CatalogItems extends NoteItems {}
}
declare module "~/editor/types" {
  interface ObjectFields {
    /** Notes: what's written on it. */
    noteText?: string
  }
}

// Registered here as well as through the module: the server checks saved
// layouts' items without an editor.
registerItems(NOTE_ITEMS)

export const isNote = (piece: Pick<SceneObject, "type">) => hasTag(piece.type, "note")
