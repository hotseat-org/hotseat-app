import { z } from "zod"
// Registers every item a saved layout may hold, before any is checked.
import "./catalog"
import { NOTE_FIELDS } from "~/examples/notes/items"
import { findItem, type ObjectType } from "~/editor/core"

/**
 * Validation for a persisted office layout. Server-safe (no three/R3F imports)
 * so it can be used in loaders/actions as well as the client. Its items come
 * from the catalogue; its fields are the editor's, the office's and those of
 * the modules the office editor runs (the notes').
 */
export const sceneObjectSchema = z.object({
  id: z.string(),
  // Any item registered in the catalogue (the editor's, the office's
  // furniture, the notes): see ./catalog.
  type: z.custom<ObjectType>((type) => typeof type === "string" && findItem(type) !== undefined, {
    message: "Not an item in the catalogue",
  }),
  x: z.number(),
  z: z.number(),
  rotation: z.number(),
  color: z.string().optional(),
  colorFront: z.string().optional(),
  colorBack: z.string().optional(),
  model: z.string().optional(),
  label: z.string().max(24).optional(),
  assignee: z.string().optional(),
  features: z.array(z.string().max(24)).max(8).optional(),
  zone: z.string().max(32).optional(),
  variant: z.number().int().min(0).optional(),
  ...NOTE_FIELDS,
})

export const layoutSchema = z.array(sceneObjectSchema)

/** A saved room (kit), as the editor sends it and the database keeps it. */
export const roomKitSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().trim().min(1).max(60),
  area: z.number().nonnegative(),
  objects: layoutSchema.max(2000),
})

export type LayoutObject = z.infer<typeof sceneObjectSchema>
