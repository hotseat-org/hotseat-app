import { nanoid } from "nanoid"
import {
  SEG,
  cellAt,
  edgeBlocked,
  edgeKey,
  enclosedRegions,
  getOpeningPaint,
  nearestEdgeId,
  openingPlan,
  paintWallFaces,
  unitEdges,
  type WallPaint,
} from "../layout"
import {
  isEdgeType,
  isOpening,
  isWall,
  type OpeningType,
  type SceneObject,
  type Cell,
  type WallCell,
  type WallType,
} from "../types"
import { dropOrphanMounts } from "./objects"
import type { GetState, SetState } from "./state"

/** Building and painting walls, doors and windows; painting floors. */
export interface WallsState {
  /** Builds wall segments (solid by default, or glass) on free edges. */
  addWalls: (cells: WallCell[], type?: WallType) => void
  /** Remove any wall/door segments sitting on the given edges. */
  removeEdges: (cells: WallCell[]) => void
  /**
   * Door / Window tool: turn a wall half-segment (+ its neighbour on the
   * cursor's side) into an opening of `kind`, an opening of that kind back into
   * two wall halves, or swap a door ⇄ window.
   */
  toggleOpening: (id: string, kind: OpeningType, point?: Cell) => void
  /**
   * Pick a door/window up to move it: it's removed and the wall is closed
   * behind it (two wall halves). Returns the lifted opening (to place later).
   */
  liftOpening: (id: string) => SceneObject | null
  /**
   * Put a lifted opening into the wall pair nearest (pointX, pointZ) — keeping its id and
   * colour, and selecting it. False when there's no wall pair there. A no-op
   * (true) if it's already in the scene, so a restore can never duplicate it.
   */
  placeOpening: (opening: SceneObject, pointX: number, pointZ: number) => boolean
  /** Recolour walls, or one face of each (null = theme default). */
  paintWalls: (targets: WallPaint[], color: string | null) => void
  /** Paint the floor of the room containing (x, z); null removes its paint. */
  paintFloor: (x: number, z: number, color: string | null) => void
}

export const createWallsState = (set: SetState, get: GetState): WallsState => ({
  addWalls: (cells, type = "wall") =>
    set((state) => {
      // Key by cell AND orientation so a corner node can hold both a
      // horizontal and a vertical segment — that overlap fills the corner.
      const taken = new Set(
        state.objects
          .filter((object) => isEdgeType(object.type))
          .flatMap(unitEdges)
          .map(edgeKey)
      )
      const color = get().placementColors[type]
      const fresh: SceneObject[] = []
      for (const cell of cells) {
        const key = edgeKey(cell)
        // Skip existing edges, and never build a wall through furniture.
        if (taken.has(key) || edgeBlocked(state.objects, cell)) continue

        taken.add(key)
        fresh.push({ id: nanoid(8), type, x: cell.x, z: cell.z, rotation: cell.rotation, color })
      }

      return fresh.length ? { objects: [...state.objects, ...fresh] } : state
    }),

  removeEdges: (cells) =>
    set((state) => {
      const kill = new Set(cells.map(edgeKey))
      // A door goes if the run touches either of its halves.
      const isKilled = (object: SceneObject) =>
        isEdgeType(object.type) && unitEdges(object).some((unit) => kill.has(edgeKey(unit)))
      const objects = dropOrphanMounts(state.objects.filter((object) => !isKilled(object)))
      if (objects.length === state.objects.length) return state

      return {
        objects,
        selectedId: objects.some((object) => object.id === state.selectedId)
          ? state.selectedId
          : null,
      }
    }),

  toggleOpening: (id, kind, point) =>
    set((state) => {
      const plan = openingPlan(state.objects, { id, kind, point })
      if (!plan) return state

      const added = plan.add.map((piece) => ({ ...piece, id: nanoid(8) }))

      return {
        objects: dropOrphanMounts([
          ...state.objects.filter((piece) => !plan.remove.includes(piece.id)),
          ...added,
        ]),
        selectedId: null,
      }
    }),

  liftOpening: (id) => {
    const opening = get().objects.find((candidate) => candidate.id === id)
    if (!opening || !isOpening(opening.type)) return null

    const plan = openingPlan(get().objects, { id, kind: opening.type })
    if (!plan) return null

    set((state) => ({
      objects: [
        ...state.objects.filter((candidate) => candidate.id !== id),
        ...plan.add.map((piece) => ({ ...piece, id: nanoid(8) })),
      ],
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))

    return opening
  },

  placeOpening: (opening, pointX, pointZ) => {
    const state = get()
    if (state.objects.some((candidate) => candidate.id === opening.id)) return true
    if (!isOpening(opening.type)) return false

    const wallId = nearestEdgeId(
      state.objects,
      { x: pointX, z: pointZ },
      { maxDistance: 0.6, accept: (wall) => isWall(wall.type) }
    )
    const plan =
      wallId &&
      openingPlan(state.objects, {
        id: wallId,
        kind: opening.type,
        point: { x: pointX, z: pointZ },
      })
    if (!plan) return false

    set({
      objects: [
        ...state.objects.filter((candidate) => !plan.remove.includes(candidate.id)),
        { ...plan.add[0], id: opening.id, color: opening.color, ...getOpeningPaint(opening) },
      ],
      selectedId: opening.id,
    })

    return true
  },

  paintWalls: (targets, color) =>
    set((state) => ({ objects: paintWallFaces(state.objects, targets, color) })),

  paintFloor: (x, z, color) => {
    const all = get().objects
    const region = enclosedRegions(all).find((candidate) =>
      candidate.some(
        (square) => square.x <= x && x < square.x + SEG && square.z <= z && z < square.z + SEG
      )
    )
    if (!region) return // outside any room

    const inRegion = (pointX: number, pointZ: number) =>
      region.some(
        (square) =>
          square.x <= pointX &&
          pointX < square.x + SEG &&
          square.z <= pointZ &&
          pointZ < square.z + SEG
      )
    // One paint per room: replace any marker already in it.
    const kept = all.filter((piece) => !(piece.type === "floorPaint" && inRegion(piece.x, piece.z)))
    const cell = cellAt(x, z)
    set({
      objects: color
        ? [
            ...kept,
            {
              id: nanoid(8),
              type: "floorPaint",
              x: cell.x + SEG / 2,
              z: cell.z + SEG / 2,
              rotation: 0,
              color,
            },
          ]
        : kept,
    })
  },
})
