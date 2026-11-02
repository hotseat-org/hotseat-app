import { z } from "zod"
// Registers every item a saved layout may hold, before any is checked.
import "./catalog"
import { SIGN_FIELDS } from "./catalog/neonSign"
import { NOTE_FIELDS } from "~/examples/notes/items"
import {
  MAX_FLOORS,
  MAX_FLOOR_NAME,
  composeLayout,
  findItem,
  type Layout,
  type ObjectType,
} from "~/editor/core"

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
  // Its floor's id (see Layout): unset, the first.
  floor: z.string().max(32).optional(),
  ...SIGN_FIELDS,
  ...NOTE_FIELDS,
})

/** Pieces (a saved room's, a layout's). */
export const piecesSchema = z.array(sceneObjectSchema)

const floorSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().trim().max(MAX_FLOOR_NAME),
})

/**
 * A saved office layout, as the editor sends it and the database keeps it:
 * its floors and every piece on them — or, saved before there were floors,
 * just its pieces (one floor).
 */
export const layoutSchema = z.union([
  z.object({ floors: z.array(floorSchema).min(1).max(MAX_FLOORS), pieces: piecesSchema }),
  piecesSchema.transform(composeLayout),
]) as z.ZodType<Layout>

/** An office's saved layout — or, unreadable (or none yet), an empty one. */
export const parseLayout = (saved: unknown): Layout => {
  const parsed = layoutSchema.safeParse(saved ?? [])

  return parsed.success ? parsed.data : composeLayout([])
}

/** A saved room (kit), as the editor sends it and the database keeps it. */
export const roomKitSchema = z.object({
  id: z.string().min(1).max(32),
  name: z.string().trim().min(1).max(60),
  area: z.number().nonnegative(),
  objects: piecesSchema.max(2000),
})

export type LayoutObject = z.infer<typeof sceneObjectSchema>
