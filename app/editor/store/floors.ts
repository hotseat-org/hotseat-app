import { nanoid } from "nanoid"
import { MAX_FLOORS, MAX_FLOOR_NAME, createFloorId, getFloorId, type Floor } from "../floors"
import { composeOuterWalls } from "../layout"
import type { SceneObject } from "../types"
import { composeSavedLayout, splitLayout } from "./objects"
import type { GetState, SetState } from "./state"

/** The layout's floors: one shown (its pieces are `objects`), the others' pieces aside. */
export interface FloorsState {
  /** From the bottom up. */
  floors: Floor[]
  /** The floor shown and edited (its id). */
  currentFloor: string
  /** The other floors' pieces, each with its floor, aside while one is shown. */
  otherFloorsPieces: SceneObject[]
  /** Show another floor — a scene of its own, so nothing to undo there yet. */
  showFloor: (id: string) => void
  /** A new floor on top, shown. */
  addFloor: () => void
  /**
   * A new floor just above another, shown — empty, or with `isWalled` that
   * one's outer walls to build in (its doors walled up).
   */
  addFloorAbove: (id: string, isWalled: boolean) => void
  renameFloor: (id: string, name: string) => void
  /** A floor one up (1) or down (-1) in the order. */
  moveFloor: (id: string, step: 1 | -1) => void
  /** A floor to this place in the order (from 0 at the bottom), the others making room. */
  moveFloorTo: (id: string, index: number) => void
  /** A floor and everything on it gone (never the last one). */
  deleteFloor: (id: string) => void
}

export const createFloorsActions = (
  set: SetState,
  get: GetState
): Omit<FloorsState, "floors" | "currentFloor" | "otherFloorsPieces"> => {
  const showLayout = (floors: Floor[], pieces: SceneObject[], floorId: string) => {
    set({ ...splitLayout({ floors, pieces }, floorId), selectedId: null })
    get().resetHistory()
  }

  return {
    showFloor: (id) => {
      const state = get()
      if (id === state.currentFloor || !state.floors.some((floor) => floor.id === id)) return

      showLayout(state.floors, composeSavedLayout(state).pieces, id)
    },
    addFloor: () => {
      const { floors, addFloorAbove } = get()

      addFloorAbove(floors[floors.length - 1].id, false)
    },
    addFloorAbove: (id, isWalled) => {
      const state = get()
      const index = state.floors.findIndex((floor) => floor.id === id)
      if (index < 0 || state.floors.length >= MAX_FLOORS) return

      const floor = { id: createFloorId(state.floors), name: "" }
      const floors = [...state.floors.slice(0, index + 1), floor, ...state.floors.slice(index + 1)]
      const pieces = composeSavedLayout({ ...state, floors }).pieces
      const below = pieces.filter((piece) => getFloorId(piece, floors) === id)
      const walls = isWalled
        ? composeOuterWalls(below).map((wall) => ({ ...wall, id: nanoid(8), floor: floor.id }))
        : []

      showLayout(floors, [...pieces, ...walls], floor.id)
    },
    renameFloor: (id, name) =>
      set((state) => ({
        floors: state.floors.map((floor) =>
          floor.id === id ? { ...floor, name: name.trim().slice(0, MAX_FLOOR_NAME) } : floor
        ),
      })),
    moveFloor: (id, step) => {
      const { floors, moveFloorTo } = get()

      moveFloorTo(id, floors.findIndex((floor) => floor.id === id) + step)
    },
    moveFloorTo: (id, index) =>
      set((state) => {
        const from = state.floors.findIndex((floor) => floor.id === id)
        if (from < 0 || from === index || index < 0 || index >= state.floors.length) return state

        const floors = state.floors.filter((floor) => floor.id !== id)
        floors.splice(index, 0, state.floors[from])

        return { floors }
      }),
    deleteFloor: (id) => {
      const state = get()
      const index = state.floors.findIndex((floor) => floor.id === id)
      if (index < 0 || state.floors.length === 1) return

      const floors = state.floors.filter((floor) => floor.id !== id)
      // With two floors or more, each piece is saved with its floor.
      const pieces = composeSavedLayout(state).pieces.filter((piece) => piece.floor !== id)
      const shown =
        id === state.currentFloor ? (floors[index - 1] ?? floors[0]).id : state.currentFloor
      showLayout(floors, pieces, shown)
    },
  }
}
