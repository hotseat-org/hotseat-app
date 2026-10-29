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
  type WallCell,
  type WallType,
} from "../types"
import { dropOrphanMounts } from "./objects"
import type { GetState, SetState } from "./state"

/** Building and painting walls, doors and windows; painting floors. */
export interface WallsSlice {
  /** Builds wall segments (solid by default, or glass) on free edges. */
  addWalls: (cells: WallCell[], type?: WallType) => void
  /** Remove any wall/door segments sitting on the given edges. */
  removeEdges: (cells: WallCell[]) => void
  /**
   * Door / Window tool: turn a wall half-segment (+ its neighbour on the
   * cursor's side) into an opening of `kind`, an opening of that kind back into
   * two wall halves, or swap a door ⇄ window.
   */
  toggleOpening: (id: string, kind: OpeningType, px?: number, pz?: number) => void
  /**
   * Pick a door/window up to move it: it's removed and the wall is closed
   * behind it (two wall halves). Returns the lifted opening (to place later).
   */
  liftOpening: (id: string) => SceneObject | null
  /**
   * Put a lifted opening into the wall pair nearest (px,pz) — keeping its id and
   * colour, and selecting it. False when there's no wall pair there. A no-op
   * (true) if it's already in the scene, so a restore can never duplicate it.
   */
  placeOpening: (o: SceneObject, px: number, pz: number) => boolean
  /** Recolour walls, or one face of each (null = theme default). */
  paintWalls: (targets: WallPaint[], color: string | null) => void
  /** Paint the floor of the room containing (x, z); null removes its paint. */
  paintFloor: (x: number, z: number, color: string | null) => void
}

export const createWallsSlice = (set: SetState, get: GetState): WallsSlice => ({
  addWalls: (cells, type = "wall") =>
    set((s) => {
      // Key by cell AND orientation so a corner node can hold both a
      // horizontal and a vertical segment — that overlap fills the corner.
      const taken = new Set(
        s.objects
          .filter((o) => isEdgeType(o.type))
          .flatMap(unitEdges)
          .map(edgeKey)
      )
      const color = get().placementColors[type]
      const fresh: SceneObject[] = []
      for (const c of cells) {
        const k = edgeKey(c)
        // Skip existing edges, and never build a wall through furniture.
        if (taken.has(k) || edgeBlocked(s.objects, c)) continue
        taken.add(k)
        fresh.push({ id: nanoid(8), type, x: c.x, z: c.z, rotation: c.rotation, color })
      }
      return fresh.length ? { objects: [...s.objects, ...fresh] } : s
    }),

  removeEdges: (cells) =>
    set((s) => {
      const kill = new Set(cells.map(edgeKey))
      // A door goes if the run touches either of its halves.
      const isKilled = (o: SceneObject) =>
        isEdgeType(o.type) && unitEdges(o).some((e) => kill.has(edgeKey(e)))
      const objects = dropOrphanMounts(s.objects.filter((o) => !isKilled(o)))
      if (objects.length === s.objects.length) return s
      return {
        objects,
        selectedId: objects.some((o) => o.id === s.selectedId) ? s.selectedId : null,
      }
    }),

  toggleOpening: (id, kind, px, pz) =>
    set((s) => {
      const plan = openingPlan(s.objects, id, kind, px, pz)
      if (!plan) return s
      const added = plan.add.map((o) => ({ ...o, id: nanoid(8) }))
      return {
        objects: dropOrphanMounts([
          ...s.objects.filter((o) => !plan.remove.includes(o.id)),
          ...added,
        ]),
        selectedId: null,
      }
    }),

  liftOpening: (id) => {
    const o = get().objects.find((obj) => obj.id === id)
    if (!o || !isOpening(o.type)) return null
    const plan = openingPlan(get().objects, id, o.type)
    if (!plan) return null
    set((s) => ({
      objects: [
        ...s.objects.filter((obj) => obj.id !== id),
        ...plan.add.map((w) => ({ ...w, id: nanoid(8) })),
      ],
      selectedId: s.selectedId === id ? null : s.selectedId,
    }))
    return o
  },

  placeOpening: (o, px, pz) => {
    const s = get()
    if (s.objects.some((obj) => obj.id === o.id)) return true
    if (!isOpening(o.type)) return false
    const wallId = nearestEdgeId(s.objects, px, pz, 0.6, (w) => isWall(w.type))
    const plan = wallId && openingPlan(s.objects, wallId, o.type, px, pz)
    if (!plan) return false
    set({
      objects: [
        ...s.objects.filter((obj) => !plan.remove.includes(obj.id)),
        { ...plan.add[0], id: o.id, color: o.color, ...getOpeningPaint(o) },
      ],
      selectedId: o.id,
    })
    return true
  },

  paintWalls: (targets, color) =>
    set((s) => ({ objects: paintWallFaces(s.objects, targets, color) })),

  paintFloor: (x, z, color) => {
    const all = get().objects
    const region = enclosedRegions(all).find((r) =>
      r.some((c) => c.x <= x && x < c.x + SEG && c.z <= z && z < c.z + SEG)
    )
    if (!region) return // outside any room
    const inRegion = (px: number, pz: number) =>
      region.some((c) => c.x <= px && px < c.x + SEG && c.z <= pz && pz < c.z + SEG)
    // One paint per room: replace any marker already in it.
    const kept = all.filter((o) => !(o.type === "floorPaint" && inRegion(o.x, o.z)))
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
