import { nanoid } from "nanoid"
import {
  ROTATION_STEP,
  clampToFloor,
  furnitureCollides,
  snapToFootprint,
  toRotationStep,
} from "../layout"
import { isEdgeType, isRecolorable, variantOf, type ObjectType, type SceneObject } from "../types"
import { asNewDesks } from "./desks"
import { HISTORY_LIMIT } from "./history"
import { dropOrphanMounts } from "./objects"
import type { GetState, SetState } from "./state"

export interface NewObject {
  type: ObjectType
  x: number
  z: number
  rotation?: number
  color?: string
  model?: string
}

/** Placing, moving and turning single pieces. */
export interface FurnitureSlice {
  addObject: (obj: NewObject) => string
  /** Several pieces in one step (one undo): any that would collide are skipped. */
  addObjects: (objs: NewObject[]) => number
  /** Moves a piece; wall items also turn to face out from their new wall. */
  moveObject: (id: string, x: number, z: number, rotation?: number) => void
  rotateObject: (id: string) => void
  setColor: (id: string, color: string) => void
  /** Gives each piece its next look (props, cushions…). */
  shuffleLook: (ids: string[]) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void
  /**
   * A piece turned in place into others: where it stood before it last
   * overlapped nothing, and the undo steps since. Deselected still
   * overlapping, it springs back there (see settleTurn) — as a refused drop.
   */
  pendingTurn: {
    id: string
    x: number
    z: number
    rotation: number
    historyLength: number
    steps: number
  } | null
  /** The last turn sprung back (a timestamp) — the piece shakes "no". */
  refusedTurn: { id: string; at: number } | null
}

/**
 * Once a piece turned into others is let go (deselected): still
 * overlapping, it goes back to where it last stood free and shakes — and
 * the turns leave no undo steps, as though refused. Runs after every change.
 */
export const settleTurn = (rawSet: SetState, get: GetState) => {
  const { pendingTurn: turn, selectedId, objects, past } = get()
  if (!turn || selectedId === turn.id) return
  const o = objects.find((obj) => obj.id === turn.id)
  if (!o || !furnitureCollides(objects, o.type, o.x, o.z, o.rotation, o.id))
    return rawSet({ pendingTurn: null })
  const { x, z, rotation } = turn
  const isOnlyTurns = past.length === turn.historyLength + turn.steps
  rawSet({
    pendingTurn: null,
    refusedTurn: { id: turn.id, at: performance.now() },
    objects: objects.map((obj) => (obj.id === turn.id ? { ...obj, x, z, rotation } : obj)),
    ...(isOnlyTurns
      ? { past: past.slice(0, turn.historyLength) }
      : { past: [...past, objects].slice(-HISTORY_LIMIT), future: [] }),
  })
}

export const createFurnitureSlice = (set: SetState, get: GetState): FurnitureSlice => ({
  addObject: ({ type, x, z, rotation = 0, color, model }) => {
    // Don't place furniture inside existing furniture.
    if (furnitureCollides(get().objects, type, x, z, rotation)) return ""
    const id = nanoid(8)
    set((s) => ({
      objects: [
        ...s.objects,
        ...asNewDesks(s.objects, [{ id, type, x, z, rotation, color, model }]),
      ],
    }))
    return id
  },

  addObjects: (objs) => {
    const placed: SceneObject[] = []
    for (const { type, x, z, rotation = 0, color, model } of objs) {
      if (furnitureCollides([...get().objects, ...placed], type, x, z, rotation)) continue
      placed.push({ id: nanoid(8), type, x, z, rotation, color, model })
    }
    if (placed.length) set((s) => ({ objects: [...s.objects, ...asNewDesks(s.objects, placed)] }))
    return placed.length
  },

  moveObject: (id, x, z, rotation) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        o.id === id ? { ...o, x, z, rotation: rotation ?? o.rotation } : o
      ),
    })),

  rotateObject: (id) => {
    const s = get()
    const o = s.objects.find((obj) => obj.id === id)
    // Walls/doors live on grid edges — turning one in place would leave it
    // off the edge grid, so they don't rotate.
    if (!o || isEdgeType(o.type)) return
    const rotation = toRotationStep(o.rotation + ROTATION_STEP)
    // An odd×even footprint changes parity when turned; re-snap so it still
    // sits on whole grid squares. A turn into other furniture is allowed —
    // carried, the drop checks it; in place, letting go of it does (and it
    // springs back to where it last stood free, see settleTurn).
    const p = clampToFloor(o.type, rotation, snapToFootprint(o.type, rotation, o.x, o.z))
    const isOverlapping = furnitureCollides(s.objects, o.type, p.x, p.z, rotation, o.id)
    const isInPlace = s.carryingId !== id
    const turn = s.pendingTurn?.id === id ? s.pendingTurn : null
    const pendingTurn = !isInPlace
      ? s.pendingTurn
      : !isOverlapping
        ? null
        : turn
          ? { ...turn, steps: turn.steps + 1 }
          : {
              id,
              x: o.x,
              z: o.z,
              rotation: o.rotation,
              historyLength: s.past.length,
              steps: 1,
            }
    set({
      pendingTurn,
      objects: s.objects.map((obj) => (obj.id === id ? { ...obj, ...p, rotation } : obj)),
    })
  },

  setColor: (id, color) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id && isRecolorable(o.type) ? { ...o, color } : o)),
    })),

  shuffleLook: (ids) =>
    set((s) => ({
      objects: s.objects.map((o) =>
        ids.includes(o.id) ? { ...o, variant: (variantOf(o) + 1) % 1000 } : o
      ),
    })),

  removeObject: (id) =>
    set((s) => ({
      objects: dropOrphanMounts(s.objects.filter((o) => o.id !== id)),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  duplicateObject: (id) =>
    set((s) => {
      const src = s.objects.find((o) => o.id === id)
      // Only furniture duplicates (a copied wall edge would be a stray segment).
      if (!src || isEdgeType(src.type)) return s
      // Drop the copy on the nearest free spot beside/around the original.
      const offsets = [1, 2, 3].flatMap((d) => [
        [d, 0],
        [0, d],
        [-d, 0],
        [0, -d],
        [d, d],
        [-d, -d],
        [d, -d],
        [-d, d],
      ])
      for (const [dx, dz] of offsets) {
        const p = clampToFloor(src.type, src.rotation, { x: src.x + dx, z: src.z + dz })
        if (furnitureCollides(s.objects, src.type, p.x, p.z, src.rotation)) continue
        const [clone] = asNewDesks(s.objects, [{ ...src, id: nanoid(8), ...p, variant: undefined }])
        return { objects: [...s.objects, clone], selectedId: clone.id }
      }
      return s
    }),

  pendingTurn: null,
  refusedTurn: null,
})
