import { nanoid } from "nanoid"
import { ROTATION_STEP, groupCollides, snapToFootprint, toRotationStep } from "../layout"
import { isEdgeType, isMarker, isRecolorable, type SceneObject } from "../types"
import { asNewDesks } from "./desks"
import type { GetState, SetState } from "./state"

/** What's selected, and what's done to the whole selection. */
export interface SelectionSlice {
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
  box: { x0: number; y0: number; x1: number; y1: number; additive: boolean } | null
  setBox: (box: SelectionSlice["box"]) => void
  select: (id: string | null) => void
  /** Shift-click: add/remove furniture to/from the selection. */
  toggleSelect: (id: string) => void
  /** Box select: replace the selection. */
  selectMany: (ids: string[]) => void
  /** Group operations on the whole selection (furniture). */
  removeSelection: () => void
  rotateSelection: () => void
  colorSelection: (color: string) => void
  /** Move the selection by (dx, dz) — refused if anything would collide. */
  nudgeSelection: (dx: number, dz: number) => boolean
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
  const exists = new Set(objects.map((o) => o.id))
  const primary = selectedId && exists.has(selectedId) ? selectedId : null
  let sel = selection.filter((id) => exists.has(id))
  if (!primary) sel = []
  else if (!sel.includes(primary)) sel = [primary]
  if (
    primary !== selectedId ||
    sel.length !== selection.length ||
    sel.some((id, i) => id !== selection[i])
  )
    rawSet({ selectedId: primary, selection: sel })
}

export const createSelectionSlice = (set: SetState, get: GetState): SelectionSlice => {
  // Furniture in the current selection (group ops skip walls/openings).
  const selectedFurniture = () => {
    const { selection, objects } = get()
    const ids = new Set(selection)
    return objects.filter((o) => ids.has(o.id) && !isEdgeType(o.type) && !isMarker(o.type))
  }
  /** Place copies of `src` at the first free offset; returns them (or null). */
  const placeCopies = (src: SceneObject[]): SceneObject[] | null => {
    const offsets = [1, 2, 3].flatMap((d) => [
      [d, d],
      [d, 0],
      [0, d],
      [-d, 0],
      [0, -d],
      [-d, -d],
    ])
    for (const [dx, dz] of offsets) {
      // Copies get their own look (variant unset → derived from the new id).
      const copies = asNewDesks(
        get().objects,
        src.map((o) => ({ ...o, id: nanoid(8), x: o.x + dx, z: o.z + dz, variant: undefined }))
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
      const o = objects.find((obj) => obj.id === id)
      if (!o || isEdgeType(o.type)) return
      const next = selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id]
      set({ selection: next, selectedId: next[next.length - 1] ?? null })
    },
    selectMany: (ids) => set({ selection: ids, selectedId: ids[0] ?? null }),

    removeSelection: () => {
      const ids = new Set(get().selection)
      if (ids.size === 0) return
      set((s) => ({ objects: s.objects.filter((o) => !ids.has(o.id)), selectedId: null }))
    },
    rotateSelection: () => {
      const group = selectedFurniture()
      if (group.length === 1) return get().rotateObject(group[0].id)
      // Each piece turns in place (re-snapped); refused if any would collide.
      const turned = group.map((o) => {
        const rotation = toRotationStep(o.rotation + ROTATION_STEP)
        return { ...o, ...snapToFootprint(o.type, rotation, o.x, o.z), rotation }
      })
      if (groupCollides(get().objects, turned)) return
      const byId = new Map(turned.map((o) => [o.id, o]))
      set((s) => ({ objects: s.objects.map((o) => byId.get(o.id) ?? o) }))
    },
    colorSelection: (color) => {
      const ids = new Set(get().selection)
      set((s) => ({
        objects: s.objects.map((o) =>
          ids.has(o.id) && isRecolorable(o.type) ? { ...o, color } : o
        ),
      }))
    },
    nudgeSelection: (dx, dz) => {
      const group = selectedFurniture()
      if (group.length === 0) return false
      const moved = group.map((o) => ({ ...o, x: o.x + dx, z: o.z + dz }))
      if (groupCollides(get().objects, moved)) return false
      const byId = new Map(moved.map((o) => [o.id, o]))
      set((s) => ({ objects: s.objects.map((o) => byId.get(o.id) ?? o) }))
      return true
    },
    copySelection: () => {
      const group = selectedFurniture()
      if (group.length) set({ clipboard: group })
    },
    paste: () => {
      const src = get().clipboard
      if (src.length === 0) return
      const copies = placeCopies(src)
      if (!copies) return
      // Next paste steps further along, like most editors.
      set((s) => ({
        objects: [...s.objects, ...copies],
        clipboard: copies,
        selection: copies.map((o) => o.id),
        selectedId: copies[0].id,
      }))
    },
    duplicateSelection: () => {
      const group = selectedFurniture()
      const copies = group.length ? placeCopies(group) : null
      if (!copies) return
      set((s) => ({
        objects: [...s.objects, ...copies],
        selection: copies.map((o) => o.id),
        selectedId: copies[0].id,
      }))
    },
  }
}
