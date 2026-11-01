import type { SceneObject } from "./types"
import type { Translator } from "~/i18n/translate"

/** One floor of a layout. */
export interface Floor {
  id: string
  /** Its name; empty until named (shown as its number, see getFloorNumber). */
  name: string
}

/** A whole layout: its floors, from the bottom up, and every piece on them. */
export interface Layout {
  floors: Floor[]
  /** Each on its floor (see getFloorId). */
  pieces: SceneObject[]
}

/** The floor every layout starts with. */
export const FIRST_FLOOR: Floor = { id: "floor-1", name: "" }

/** Most floors a layout may have. */
export const MAX_FLOORS = 20

/** Longest a floor's name may be. */
export const MAX_FLOOR_NAME = 40

/** A layout of one floor holding `pieces` (a template, one saved before floors). */
export const composeLayout = (pieces: SceneObject[]): Layout => ({
  floors: [FIRST_FLOOR],
  pieces,
})

/** A saved layout as the editor reads it: { floors, pieces }, or a list of pieces (one floor). */
export const readSavedLayout = (saved: unknown): Layout => {
  if (Array.isArray(saved)) return composeLayout(saved as SceneObject[])

  const layout = saved as Partial<Layout> | null | undefined
  if (!layout?.floors?.length || !Array.isArray(layout.pieces)) return composeLayout([])

  return { floors: layout.floors, pieces: layout.pieces }
}

/** The floor a piece is on: its own — or, with none (or one that's gone), the first. */
export const getFloorId = (piece: Pick<SceneObject, "floor">, floors: Floor[]) =>
  piece.floor && floors.some((floor) => floor.id === piece.floor) ? piece.floor : floors[0].id

/** A floor's number, the European way: 0 for the ground floor at the bottom, then 1, 2… */
export const getFloorNumber = (floors: Floor[], id: string) =>
  floors.findIndex((floor) => floor.id === id)

/** What an unnamed floor is called, by its number: "Ground floor", "Floor 1"… */
export const getFloorTitle = ({ t }: Pick<Translator, "t">, number: number) =>
  number === 0 ? t("Ground floor") : t("Floor {number}", { number })

/** Which floor something's on, to show: its name, or (unnamed) its number. */
export interface FloorLabel {
  name: string
  number: number
}

/** The label of a piece's floor — none in a one-floor layout (nothing to tell apart). */
export const getFloorLabel = (
  floors: Floor[],
  piece: Pick<SceneObject, "floor">
): FloorLabel | undefined => {
  if (floors.length < 2) return undefined

  const id = getFloorId(piece, floors)
  const floor = floors.find((candidate) => candidate.id === id)

  return { name: floor?.name ?? "", number: getFloorNumber(floors, id) }
}

/** An id for a new floor, unlike the others'. */
export const createFloorId = (floors: Floor[]) => {
  const taken = new Set(floors.map((floor) => floor.id))
  let number = floors.length + 1
  while (taken.has(`floor-${number}`)) number += 1

  return `floor-${number}`
}
