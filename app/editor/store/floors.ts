import { MAX_FLOORS, MAX_FLOOR_NAME, createFloorId, type Floor } from "../floors"
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
  renameFloor: (id: string, name: string) => void
  /** A floor one up (1) or down (-1) in the order. */
  moveFloor: (id: string, step: 1 | -1) => void
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
      const state = get()
      if (state.floors.length >= MAX_FLOORS) return

      const floor = { id: createFloorId(state.floors), name: "" }
      // The pieces keep their floors (one floor's carry none in the saved layout).
      const pieces = composeSavedLayout({ ...state, floors: [...state.floors, floor] }).pieces
      showLayout([...state.floors, floor], pieces, floor.id)
    },
    renameFloor: (id, name) =>
      set((state) => ({
        floors: state.floors.map((floor) =>
          floor.id === id ? { ...floor, name: name.trim().slice(0, MAX_FLOOR_NAME) } : floor
        ),
      })),
    moveFloor: (id, step) =>
      set((state) => {
        const index = state.floors.findIndex((floor) => floor.id === id)
        const target = index + step
        if (index < 0 || target < 0 || target >= state.floors.length) return state

        const floors = [...state.floors]
        ;[floors[index], floors[target]] = [floors[target], floors[index]]

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
