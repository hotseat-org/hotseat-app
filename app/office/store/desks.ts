import { findDeskChair, toWorld } from "../desks/seatSpot"
import { isSeatable } from "../catalog"
import { numberDesksByZone } from "../zones/zones"
import { type OfficeGetState, type OfficeSetState } from "./state"
import { type SceneObject } from "~/editor/core"
import { snapToFootprint } from "~/editor/core"

/** Desks: their labels, residents, zones and features. */
export interface DesksState {
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
  const taken = new Set(objects.map((piece) => piece.label).filter(Boolean))
  let counter = 1

  return () => {
    while (taken.has(`D-${counter}`)) counter++
    taken.add(`D-${counter}`)

    return `D-${counter}`
  }
}

/** Every unlabelled desk numbered, back to front, left to right. */
export const numberUnlabelledDesks = (objects: SceneObject[]): SceneObject[] => {
  const next = freeDeskLabels(objects)
  const labels = new Map(
    objects
      .filter((piece) => isSeatable(piece.type) && !piece.label)
      .sort((first, second) => first.z - second.z || first.x - second.x)
      .map((piece) => [piece.id, next()])
  )

  return labels.size
    ? objects.map((piece) =>
        labels.has(piece.id) ? { ...piece, label: labels.get(piece.id) } : piece
      )
    : objects
}

/**
 * New desks (placed, pasted, duplicated) get the next free number and no
 * permanent resident — a copy never shares the original's label or person.
 */
export const asNewDesks = (existing: SceneObject[], fresh: SceneObject[]): SceneObject[] => {
  const next = freeDeskLabels(existing)

  return fresh.map((piece) =>
    isSeatable(piece.type) ? { ...piece, label: next(), assignee: undefined } : piece
  )
}

export const createDesksState = (set: OfficeSetState, _get: OfficeGetState): DesksState => ({
  setSeatLabel: (id, label) =>
    set((state) => ({
      objects: state.objects.map((piece) =>
        piece.id === id ? { ...piece, label: label.trim() || undefined } : piece
      ),
    })),
  assignSeat: (id, email) =>
    set((state) => ({
      objects: state.objects.map((piece) => {
        if (piece.id === id) return { ...piece, assignee: email ?? undefined }
        // One desk per person: free their previous desk.
        if (email && piece.assignee === email) return { ...piece, assignee: undefined }

        return piece
      }),
    })),
  numberDesks: () =>
    set((state) => {
      const objects = numberUnlabelledDesks(state.objects)

      return objects === state.objects ? state : { objects }
    }),
  setZone: (ids, zone) =>
    set((state) => {
      const targets = new Set(ids)
      const name = zone?.trim().slice(0, 32) || undefined

      return {
        objects: state.objects.map((piece) =>
          targets.has(piece.id) && isSeatable(piece.type) ? { ...piece, zone: name } : piece
        ),
      }
    }),
  numberDesksByZone: () => set((state) => ({ objects: numberDesksByZone(state.objects) })),
  toggleDeskFeature: (id, feature) =>
    set((state) => ({
      objects: state.objects.map((piece) => {
        if (piece.id !== id) return piece

        const has = piece.features?.includes(feature)
        const features = has
          ? (piece.features ?? []).filter((existing) => existing !== feature)
          : [...(piece.features ?? []), feature]

        return { ...piece, features: features.length ? features : undefined }
      }),
    })),
  replaceWithWorkstation: (id) =>
    set((state) => {
      const desk = state.objects.find((piece) => piece.id === id)
      if (!desk || (desk.type !== "desk" && desk.type !== "deskmate")) return state

      // A workstation's desk sits 0.25 m back from its centre; a deskmate's 0.35.
      const shift = desk.type === "desk" ? 0.25 : 0.1
      const centre = toWorld(desk, 0, shift)
      const snapped = snapToFootprint({ type: "workstation", rotation: desk.rotation }, centre)
      const chair =
        desk.type === "desk"
          ? findDeskChair(
              desk,
              state.objects.filter((piece) => piece.type === "seat")
            )
          : undefined

      return {
        objects: state.objects
          .filter((piece) => piece.id !== chair?.id)
          .map((piece) =>
            piece.id === id
              ? { ...piece, type: "workstation" as const, ...snapped, model: undefined }
              : piece
          ),
        selection: state.selection.filter((selected) => selected !== chair?.id),
      }
    }),
})
