import type { SceneObject } from "../types"
import type { GetState, SetState } from "./state"

/** Max undo steps kept. */
export const HISTORY_LIMIT = 100

export interface HistoryState {
  /** Earlier scenes, oldest first. */
  past: SceneObject[][]
  /** Undone scenes, most recently undone last. */
  future: SceneObject[][]
  undo: () => void
  redo: () => void
  /**
   * Group a multi-step interaction (carrying furniture, moving a door) into ONE
   * undo step: changes between begin and end aren't recorded individually.
   */
  beginBatch: () => void
  endBatch: () => void
}

interface HistoryInternals {
  /** True while undo/redo applies a snapshot (don't record it). */
  applying: boolean
  /** Scene at the start of an open batch, or null. */
  batch: SceneObject[] | null
}

/** Content-only view for "did anything change" (ids are regenerated freely). */
const stripIds = (objects: SceneObject[]) =>
  objects
    .map(({ id: _id, ...rest }) => rest)
    .sort(
      (first, second) =>
        first.x - second.x || first.z - second.z || first.type.localeCompare(second.type)
    )

/**
 * Undo / redo, and the `set` every other part of the state is given. Every change to
 * `objects` made through that `set` becomes an undo step — so all actions are
 * undoable with no per-action code — except while undo/redo applies a snapshot
 * or a batch is open. (Persist rehydration uses the store API directly, so
 * it's never recorded.) `afterSet` runs after each change.
 */
export const createHistory = (
  rawSet: SetState,
  get: GetState,
  afterSet: () => void
): { set: SetState; state: HistoryState } => {
  // Per-store bookkeeping (not state: not rendered, not persisted).
  const history: HistoryInternals = { applying: false, batch: null }
  const set: SetState = (partial, replace?: boolean) => {
    const before = get().objects
    ;(rawSet as (update: typeof partial, shouldReplace?: boolean) => void)(partial, replace)
    const after = get().objects
    afterSet()
    if (after === before || history.applying || history.batch) return

    rawSet({ past: [...get().past, before].slice(-HISTORY_LIMIT), future: [] })
  }
  const state: HistoryState = {
    past: [],
    future: [],
    // These only move snapshots between the stacks; `set` records the rest.
    undo: () => {
      if (history.batch) return // mid-carry: finish (or cancel) it first

      const { past, future, objects, selectedId } = get()
      const prev = past[past.length - 1]
      if (!prev) return

      history.applying = true
      set({
        objects: prev,
        past: past.slice(0, -1),
        future: [...future, objects],
        selectedId: prev.some((piece) => piece.id === selectedId) ? selectedId : null,
      })
      history.applying = false
    },
    redo: () => {
      if (history.batch) return // mid-carry: finish (or cancel) it first

      const { past, future, objects, selectedId } = get()
      const next = future[future.length - 1]
      if (!next) return

      history.applying = true
      set({
        objects: next,
        past: [...past, objects],
        future: future.slice(0, -1),
        selectedId: next.some((piece) => piece.id === selectedId) ? selectedId : null,
      })
      history.applying = false
    },
    beginBatch: () => {
      if (!history.batch) history.batch = get().objects
    },
    endBatch: () => {
      const base = history.batch
      history.batch = null
      const { objects, past } = get()
      // Nothing (visibly) changed → no step (e.g. a door put back where it was).
      if (!base || JSON.stringify(stripIds(base)) === JSON.stringify(stripIds(objects))) return

      rawSet({ past: [...past, base].slice(-HISTORY_LIMIT), future: [] })
    },
  }

  return { set, state }
}
