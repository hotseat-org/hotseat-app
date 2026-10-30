import { nanoid } from "nanoid"
import {
  ROTATION_STEP,
  clampToFloor,
  furnitureCollides,
  snapToFootprint,
  toRotationStep,
} from "../layout"
import { isEdgeType, isRecolorable, variantOf, type ObjectType, type SceneObject } from "../types"
import { HISTORY_LIMIT } from "./history"
import { dropOrphanMounts } from "./objects"
import type { GetState, SetState, StoreHooks } from "./state"

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
  addObject: (piece: NewObject) => string
  /** Several pieces in one step (one undo): any that would collide are skipped. */
  addObjects: (pieces: NewObject[]) => number
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

  const piece = objects.find((candidate) => candidate.id === turn.id)
  if (!piece || !furnitureCollides(objects, piece.type, piece.x, piece.z, piece.rotation, piece.id))
    return rawSet({ pendingTurn: null })

  const { x, z, rotation } = turn
  const isOnlyTurns = past.length === turn.historyLength + turn.steps
  rawSet({
    pendingTurn: null,
    refusedTurn: { id: turn.id, at: performance.now() },
    objects: objects.map((candidate) =>
      candidate.id === turn.id ? { ...candidate, x, z, rotation } : candidate
    ),
    ...(isOnlyTurns
      ? { past: past.slice(0, turn.historyLength) }
      : { past: [...past, objects].slice(-HISTORY_LIMIT), future: [] }),
  })
}

export const createFurnitureSlice = (
  set: SetState,
  get: GetState,
  hooks: StoreHooks
): FurnitureSlice => ({
  addObject: ({ type, x, z, rotation = 0, color, model }) => {
    // Don't place furniture inside existing furniture.
    if (furnitureCollides(get().objects, type, x, z, rotation)) return ""

    const id = nanoid(8)
    set((state) => ({
      objects: [
        ...state.objects,
        ...hooks.prepareNewPieces(state.objects, [{ id, type, x, z, rotation, color, model }]),
      ],
    }))

    return id
  },

  addObjects: (pieces) => {
    const placed: SceneObject[] = []
    for (const { type, x, z, rotation = 0, color, model } of pieces) {
      if (furnitureCollides([...get().objects, ...placed], type, x, z, rotation)) continue

      placed.push({ id: nanoid(8), type, x, z, rotation, color, model })
    }
    if (placed.length)
      set((state) => ({
        objects: [...state.objects, ...hooks.prepareNewPieces(state.objects, placed)],
      }))

    return placed.length
  },

  moveObject: (id, x, z, rotation) =>
    set((state) => ({
      objects: state.objects.map((piece) =>
        piece.id === id ? { ...piece, x, z, rotation: rotation ?? piece.rotation } : piece
      ),
    })),

  rotateObject: (id) => {
    const state = get()
    const piece = state.objects.find((candidate) => candidate.id === id)
    // Walls/doors live on grid edges — turning one in place would leave it
    // off the edge grid, so they don't rotate.
    if (!piece || isEdgeType(piece.type)) return

    const rotation = toRotationStep(piece.rotation + ROTATION_STEP)
    // An odd×even footprint changes parity when turned; re-snap so it still
    // sits on whole grid squares. A turn into other furniture is allowed —
    // carried, the drop checks it; in place, letting go of it does (and it
    // springs back to where it last stood free, see settleTurn).
    const snapped = clampToFloor(
      piece.type,
      rotation,
      snapToFootprint(piece.type, rotation, piece.x, piece.z)
    )
    const isOverlapping = furnitureCollides(
      state.objects,
      piece.type,
      snapped.x,
      snapped.z,
      rotation,
      piece.id
    )
    const isInPlace = state.carryingId !== id
    const turn = state.pendingTurn?.id === id ? state.pendingTurn : null
    const pendingTurn = !isInPlace
      ? state.pendingTurn
      : !isOverlapping
        ? null
        : turn
          ? { ...turn, steps: turn.steps + 1 }
          : {
              id,
              x: piece.x,
              z: piece.z,
              rotation: piece.rotation,
              historyLength: state.past.length,
              steps: 1,
            }
    set({
      pendingTurn,
      objects: state.objects.map((candidate) =>
        candidate.id === id ? { ...candidate, ...snapped, rotation } : candidate
      ),
    })
  },

  setColor: (id, color) =>
    set((state) => ({
      objects: state.objects.map((piece) =>
        piece.id === id && isRecolorable(piece.type) ? { ...piece, color } : piece
      ),
    })),

  shuffleLook: (ids) =>
    set((state) => ({
      objects: state.objects.map((piece) =>
        ids.includes(piece.id) ? { ...piece, variant: (variantOf(piece) + 1) % 1000 } : piece
      ),
    })),

  removeObject: (id) =>
    set((state) => ({
      objects: dropOrphanMounts(state.objects.filter((piece) => piece.id !== id)),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  duplicateObject: (id) =>
    set((state) => {
      const original = state.objects.find((piece) => piece.id === id)
      // Only furniture duplicates (a copied wall edge would be a stray segment).
      if (!original || isEdgeType(original.type)) return state

      // Drop the copy on the nearest free spot beside/around the original.
      const offsets = [1, 2, 3].flatMap((distance) => [
        [distance, 0],
        [0, distance],
        [-distance, 0],
        [0, -distance],
        [distance, distance],
        [-distance, -distance],
        [distance, -distance],
        [-distance, distance],
      ])
      for (const [deltaX, deltaZ] of offsets) {
        const snapped = clampToFloor(original.type, original.rotation, {
          x: original.x + deltaX,
          z: original.z + deltaZ,
        })
        if (
          furnitureCollides(state.objects, original.type, snapped.x, snapped.z, original.rotation)
        )
          continue

        const [clone] = hooks.prepareNewPieces(state.objects, [
          { ...original, id: nanoid(8), ...snapped, variant: undefined },
        ])

        return { objects: [...state.objects, clone], selectedId: clone.id }
      }

      return state
    }),

  pendingTurn: null,
  refusedTurn: null,
})
