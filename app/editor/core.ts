/**
 * The editor's headless core: what pieces there are and what they are like,
 * and the geometry of a layout. No React, no three.js — safe on the server
 * (loaders and actions validate and reason about layouts with it).
 *
 * Modules and integrators import from the editor's three entry points only:
 * `~/editor/core` (this), `~/editor` (the editor's API for modules and its
 * reusable UI) and `~/editor/kit` (building blocks for a module's own 3D
 * models and plan drawings). `Editor` itself comes from `~/editor/Editor`.
 */

// The catalogue: kinds of pieces, their traits, and the editor's presets.
export * from "./catalog"

// Placed pieces and the traits asked about them.
export * from "./types"

// The geometry of a layout: walls and rooms, footprints and collisions.
export * from "./layout"
export { getStructureBounds } from "./landscape/structureField"

// Saved rooms, placed again whole.
export type { Kit, KitLibrary } from "./kits/kits"

// Sizes, colours and models shared by pieces.
export {
  DESK,
  DESKMATE_SEAT_Z,
  FLUSH_INSET,
  SEAT,
  WALL,
  WORKSTATION_SEAT_Z,
} from "./objects/dimensions"
export { MODELS, modelById, petFor, petThumb, randomModelId, type ModelDef } from "./objects/models"
export { ACCENT, PALETTE } from "./palette"
export { clamp, lerp } from "./math"
