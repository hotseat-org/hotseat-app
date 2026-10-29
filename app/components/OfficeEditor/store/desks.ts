import { snapToFootprint } from "../layout"
import { findDeskChair, toWorld } from "../seatSpot"
import { isSeatable, type SceneObject } from "../types"
import { numberDesksByZone } from "../zones"
import type { GetState, SetState } from "./state"

/** Desks: their labels, residents, zones and features. */
export interface DesksSlice {
  /** Give a desk a seat label ("" clears it). */
  setSeatLabel: (id: string, label: string) => void
  /** Seat someone at a desk (null frees it). One desk per person. */
  assignSeat: (id: string, email: string | null) => void
  /** Label every unlabelled desk D-1, D-2… in reading order (rows, then x). */
  numberDesks: () => void
  /** Put desks in a zone (by name), or out of any (null). */
  setZone: (ids: string[], zone: string | null) => void
  /** Number every desk again, after its zone (ENG-1…) — the rest D-1… */
  numberDesksByZone: () => void
  /** Desks: give or take a feature (DESK_FEATURES id). */
  toggleDeskFeature: (id: string, feature: string) => void
  /**
   * An older layout's desk without a chair, or with a pet, becomes the bookable
   * desk with its chair: same id (so its bookings, label, resident and features
   * stay), the desk where it was; a loose chair in front of it goes.
   */
  replaceWithWorkstation: (id: string) => void
}

/** Desk labels: "D-1", "D-2"… — the first numbers not already used. */
const freeDeskLabels = (objects: SceneObject[]) => {
  const taken = new Set(objects.map((o) => o.label).filter(Boolean))
  let n = 1
  return () => {
    while (taken.has(`D-${n}`)) n++
    taken.add(`D-${n}`)
    return `D-${n}`
  }
}

/** Every unlabelled desk numbered, back to front, left to right. */
export const numberUnlabelledDesks = (objects: SceneObject[]): SceneObject[] => {
  const next = freeDeskLabels(objects)
  const labels = new Map(
    objects
      .filter((o) => isSeatable(o.type) && !o.label)
      .sort((a, b) => a.z - b.z || a.x - b.x)
      .map((o) => [o.id, next()])
  )
  return labels.size
    ? objects.map((o) => (labels.has(o.id) ? { ...o, label: labels.get(o.id) } : o))
    : objects
}

/**
 * New desks (placed, pasted, duplicated) get the next free number and no
 * permanent resident — a copy never shares the original's label or person.
 */
export const asNewDesks = (existing: SceneObject[], fresh: SceneObject[]): SceneObject[] => {
  const next = freeDeskLabels(existing)
  return fresh.map((o) => (isSeatable(o.type) ? { ...o, label: next(), assignee: undefined } : o))
}

export const createDesksSlice = (set: SetState, _get: GetState): DesksSlice => ({
  setSeatLabel: (id, label) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, label: label.trim() || undefined } : o)),
    })),
  assignSeat: (id, email) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id === id) return { ...o, assignee: email ?? undefined }
        // One desk per person: free their previous desk.
        if (email && o.assignee === email) return { ...o, assignee: undefined }
        return o
      }),
    })),
  numberDesks: () =>
    set((s) => {
      const objects = numberUnlabelledDesks(s.objects)
      return objects === s.objects ? s : { objects }
    }),
  setZone: (ids, zone) =>
    set((s) => {
      const targets = new Set(ids)
      const name = zone?.trim().slice(0, 32) || undefined
      return {
        objects: s.objects.map((o) =>
          targets.has(o.id) && isSeatable(o.type) ? { ...o, zone: name } : o
        ),
      }
    }),
  numberDesksByZone: () => set((s) => ({ objects: numberDesksByZone(s.objects) })),
  toggleDeskFeature: (id, feature) =>
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o
        const has = o.features?.includes(feature)
        const features = has
          ? (o.features ?? []).filter((f) => f !== feature)
          : [...(o.features ?? []), feature]
        return { ...o, features: features.length ? features : undefined }
      }),
    })),
  replaceWithWorkstation: (id) =>
    set((s) => {
      const desk = s.objects.find((o) => o.id === id)
      if (!desk || (desk.type !== "desk" && desk.type !== "deskmate")) return s
      // A workstation's desk sits 0.25 m back from its centre; a deskmate's 0.35.
      const shift = desk.type === "desk" ? 0.25 : 0.1
      const centre = toWorld(desk, 0, shift)
      const p = snapToFootprint("workstation", desk.rotation, centre.x, centre.z)
      const chair =
        desk.type === "desk"
          ? findDeskChair(
              desk,
              s.objects.filter((o) => o.type === "seat")
            )
          : undefined
      return {
        objects: s.objects
          .filter((o) => o.id !== chair?.id)
          .map((o) =>
            o.id === id ? { ...o, type: "workstation" as const, ...p, model: undefined } : o
          ),
        selection: s.selection.filter((selected) => selected !== chair?.id),
      }
    }),
})
