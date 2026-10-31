import { nanoid } from "nanoid"
import { ROTATION_STEP, groupCollides, snapToFootprint, toRotationStep } from "../layout"
import { isEdgeType, isMarker, isRecolorable, type SceneObject } from "../types"
import type { GetState, SetState, StoreHooks } from "./state"

/** What's selected, and what's done to the whole selection. */
export interface SelectionState {
  /** Primary selection (the Inspector's target). */
  selectedId: string | null
  /**
   * Everything selected (multi-select: Shift-click / box). Kept consistent with
   * `selectedId` after every change (see syncSelection): selectedId ∈ selection, or both empty.
   */
  selection: string[]
  /** In-memory clipboard (⌘C / ⌘V). */
  clipboard: SceneObject[]
  /** An in-progress box selection, in client (screen) pixels. */
  box: { startX: number; startY: number; endX: number; endY: number; additive: boolean } | null
  setBox: (box: SelectionState["box"]) => void
  select: (id: string | null) => void
  /** Shift-click: add/remove furniture to/from the selection. */
  toggleSelect: (id: string) => void
  /** Box select: replace the selection. */
  selectMany: (ids: string[]) => void
  /** Group operations on the whole selection (furniture). */
  removeSelection: () => void
  rotateSelection: () => void
  colorSelection: (color: string) => void
  /** Move the selection by (deltaX, deltaZ) — refused if anything would collide. */
  nudgeSelection: (deltaX: number, deltaZ: number) => boolean
  copySelection: () => void
  /** Paste the clipboard beside the originals (first free offset); selects it. */
  paste: () => void
  duplicateSelection: () => void
}

/**
 * One place keeps multi-select consistent with the (many) actions that set
 * `selectedId`: drop ids that no longer exist; selectedId ∈ selection. Runs
 * after every change.
 */
export const syncSelection = (rawSet: SetState, get: GetState) => {
  const { selectedId, selection, objects } = get()
  const exists = new Set(objects.map((piece) => piece.id))
  const primary = selectedId && exists.has(selectedId) ? selectedId : null
  let nextSelection = selection.filter((id) => exists.has(id))
  if (!primary) nextSelection = []
  else if (!nextSelection.includes(primary)) nextSelection = [primary]
  if (
    primary !== selectedId ||
    nextSelection.length !== selection.length ||
    nextSelection.some((id, i) => id !== selection[i])
  )
    rawSet({ selectedId: primary, selection: nextSelection })
}

export const createSelectionState = (
  set: SetState,
  get: GetState,
  hooks: StoreHooks
): SelectionState => {
  // Furniture in the current selection (group ops skip walls/openings).
  const selectedFurniture = () => {
    const { selection, objects } = get()
    const ids = new Set(selection)

    return objects.filter(
      (piece) => ids.has(piece.id) && !isEdgeType(piece.type) && !isMarker(piece.type)
    )
  }
  /** Place copies of `src` at the first free offset; returns them (or null). */
  const placeCopies = (source: SceneObject[]): SceneObject[] | null => {
    const offsets = [1, 2, 3].flatMap((distance) => [
      [distance, distance],
      [distance, 0],
      [0, distance],
      [-distance, 0],
      [0, -distance],
      [-distance, -distance],
    ])
    for (const [deltaX, deltaZ] of offsets) {
      // Copies get their own look (variant unset → derived from the new id).
      const copies = hooks.prepareNewPieces(
        get().objects,
        source.map((piece) => ({
          ...piece,
          id: nanoid(8),
          x: piece.x + deltaX,
          z: piece.z + deltaZ,
          variant: undefined,
        }))
      )
      if (!groupCollides([...get().objects, ...copies], copies)) return copies
    }

    return null
  }

  return {
    selectedId: null,
    selection: [],
    clipboard: [],
    box: null,
    setBox: (box) => set({ box }),
    select: (selectedId) => set({ selectedId }),
    toggleSelect: (id) => {
      const { selection, objects } = get()
      const piece = objects.find((candidate) => candidate.id === id)
      if (!piece || isEdgeType(piece.type)) return

      const next = selection.includes(id)
        ? selection.filter((selected) => selected !== id)
        : [...selection, id]
      set({ selection: next, selectedId: next[next.length - 1] ?? null })
    },
    selectMany: (ids) => set({ selection: ids, selectedId: ids[0] ?? null }),

    removeSelection: () => {
      const ids = new Set(get().selection)
      if (ids.size === 0) return

      set((state) => ({
        objects: state.objects.filter((piece) => !ids.has(piece.id)),
        selectedId: null,
      }))
    },
    rotateSelection: () => {
      const group = selectedFurniture()
      if (group.length === 1) return get().rotateObject(group[0].id)

      // Each piece turns in place (re-snapped); refused if any would collide.
      const turned = group.map((piece) => {
        const rotation = toRotationStep(piece.rotation + ROTATION_STEP)

        return { ...piece, ...snapToFootprint({ type: piece.type, rotation }, piece), rotation }
      })
      if (groupCollides(get().objects, turned)) return

      const byId = new Map(turned.map((piece) => [piece.id, piece]))
      set((state) => ({ objects: state.objects.map((piece) => byId.get(piece.id) ?? piece) }))
    },
    colorSelection: (color) => {
      const ids = new Set(get().selection)
      set((state) => ({
        objects: state.objects.map((piece) =>
          ids.has(piece.id) && isRecolorable(piece.type) ? { ...piece, color } : piece
        ),
      }))
    },
    nudgeSelection: (deltaX, deltaZ) => {
      const group = selectedFurniture()
      if (group.length === 0) return false

      const moved = group.map((piece) => ({ ...piece, x: piece.x + deltaX, z: piece.z + deltaZ }))
      if (groupCollides(get().objects, moved)) return false

      const byId = new Map(moved.map((piece) => [piece.id, piece]))
      set((state) => ({ objects: state.objects.map((piece) => byId.get(piece.id) ?? piece) }))

      return true
    },
    copySelection: () => {
      const group = selectedFurniture()
      if (group.length) set({ clipboard: group })
    },
    paste: () => {
      const source = get().clipboard
      if (source.length === 0) return

      const copies = placeCopies(source)
      if (!copies) return

      // Next paste steps further along, like most editors.
      set((state) => ({
        objects: [...state.objects, ...copies],
        clipboard: copies,
        selection: copies.map((piece) => piece.id),
        selectedId: copies[0].id,
      }))
    },
    duplicateSelection: () => {
      const group = selectedFurniture()
      const copies = group.length ? placeCopies(group) : null
      if (!copies) return

      set((state) => ({
        objects: [...state.objects, ...copies],
        selection: copies.map((piece) => piece.id),
        selectedId: copies[0].id,
      }))
    },
  }
}
