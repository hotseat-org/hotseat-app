import { defineItem, hasTag, type SceneObject } from "~/editor/core"

/** A note pinned to the floor: a reminder left on the layout. */
export const NOTE_ITEMS = {
  note: defineItem({ mount: "floor", footprint: [1, 1], defaultColor: "#f2c94c", tags: ["note"] }),
}

// A kind joins the layout's types: saved layouts and the server know it too.
type NoteItems = typeof NOTE_ITEMS
declare module "~/editor/catalog/registry" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ItemKinds extends NoteItems {}
}

export const isNote = (piece: SceneObject) => hasTag(piece.type, "note")
