import { nanoid } from "nanoid"
import { createContext, useContext } from "react"
// Import everything from the "zustand" entrypoint (pre-bundled by Vite). Pulling
// createStore from "zustand/vanilla" caused a late dep re-optimize that briefly
// duplicated React and crashed useStore (blank canvas on some refreshes).
import { createStore, useStore, type StateCreator, type StoreApi } from "zustand"
import { persist } from "zustand/middleware"
import {
  SEG,
  cellAt,
  clampToFloor,
  enclosedRegions,
  nearestEdgeId,
  openingPlan,
  edgeBlocked,
  edgeKey,
  furnitureCollides,
  mountWalls,
  groupCollides,
  normalizeEdges,
  snapToFootprint,
  unitEdges,
} from "./layout"
import {
  isEdgeType,
  isMarker,
  isSeatable,
  isOpening,
  isWall,
  isWallMounted,
  variantOf,
  type WallType,
  type ObjectType,
  type OpeningType,
  type SceneObject,
  type Tool,
  type WallCell,
} from "./types"
import type { BookingsByDay, Day } from "~/utils/booking"

const HALF_TURN = Math.PI / 2

/** The viewer's local wall-clock time in hours [0,24), minute precision. */

/** The measuring-hints switch is remembered per browser (on by default). */
const MEASURE_KEY = "office-editor:measure-hints"
const readMeasurePref = () => {
  try {
    return localStorage.getItem(MEASURE_KEY) !== "off"
  } catch {
    return true
  }
}
const writeMeasurePref = (on: boolean) => writePref(MEASURE_KEY, on ? "on" : "off")
const writePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private window…): the choice just won't be remembered.
  }
}

export type OfficeView = "3d" | "2d"
const VIEW_KEY = "office-editor:view"
/**
 * The viewer's chosen view, else a guess: the simple 2D plan on devices that
 * say they're constrained (little memory, data saver), the 3D scene otherwise.
 * (No WebGL at all forces 2D regardless — see OfficeEditor.)
 */
const readViewPref = (): OfficeView => {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === "2d" || saved === "3d") return saved
  } catch {
    // Storage blocked: fall through to the guess.
  }
  if (typeof navigator === "undefined") return "3d"
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: { saveData?: boolean }
  }
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory <= 2
  return lowMemory || nav.connection?.saveData ? "2d" : "3d"
}

/** Wall items whose wall has gone (erased, or a door cut in behind them) come down too. */
const dropOrphanMounts = (objects: SceneObject[]) =>
  objects.some((o) => isWallMounted(o.type))
    ? objects.filter(
        (o) => !isWallMounted(o.type) || mountWalls(objects, o.type, o.x, o.z, o.rotation)
      )
    : objects

export const nowHours = () => {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

interface NewObject {
  type: ObjectType
  x: number
  z: number
  rotation?: number
  color?: string
  model?: string
}

/** Desk booking state for the office view (see ~/utils/booking). */
export interface Booking {
  enabled: boolean
  /** Your email (who books). */
  me: string | null
  /** The office's today; earlier days are read-only. */
  today: Day
  /** The day being shown. */
  day: Day
  /** First and last day with data (bookable up to `lastDay`). */
  from: Day
  lastDay: Day
  byDay: BookingsByDay
  /** A booking request is in flight. */
  pending: boolean
  reserve: (deskId: string, dates: Day[]) => void
  cancel: (dates: Day[]) => void
}

const NO_BOOKING: Booking = {
  enabled: false,
  me: null,
  today: "",
  day: "",
  from: "",
  lastDay: "",
  byDay: {},
  pending: false,
  reserve: () => {},
  cancel: () => {},
}

export interface EditorState {
  objects: SceneObject[]
  /** Primary selection (the Inspector's target). */
  selectedId: string | null
  /**
   * Everything selected (multi-select: Shift-click / box). Kept consistent with
   * `selectedId` centrally in `set`: selectedId ∈ selection, or both empty.
   */
  selection: string[]
  /** In-memory clipboard (⌘C / ⌘V). */
  clipboard: SceneObject[]
  tool: Tool
  /** Rotation applied to the next placed object (ephemeral, not persisted). */
  placementRotation: number
  /** Per-type placement colour; a missing entry means the type's default. */
  placementColors: Partial<Record<ObjectType, string>>
  /** Time of day in hours [0,24) driving the scene lighting. */
  timeOfDay: number
  /** Follow the real local time (the default); moving the slider turns it off. */
  syncTime: boolean
  /** Distance labels + alignment guides while placing/carrying (a per-viewer preference). */
  measureHints: boolean
  toggleMeasureHints: () => void
  /**
   * How the office is shown in view mode: the 3D scene, or the simple 2D
   * floor plan (low-powered devices). A per-viewer preference; editing is 3D.
   */
  view: OfficeView
  setView: (view: OfficeView) => void
  /** Give a desk a seat label ("" clears it). */
  setSeatLabel: (id: string, label: string) => void
  /** Seat someone at a desk (null frees it). One desk per person. */
  assignSeat: (id: string, email: string | null) => void
  /** Label every unlabelled desk D-1, D-2… in reading order (rows, then x). */
  numberDesks: () => void
  /** Desk booking for a real office (disabled in the standalone editor). */
  booking: Booking
  /** Replace the booking data/callbacks (from the route). Keeps the chosen day. */
  setBooking: (patch: Partial<Booking>) => void
  setBookingDay: (day: Day) => void
  /** Optimistic: show a booking before the server confirms (it moves the person). */
  applyReserve: (deskId: string, email: string, dates: Day[]) => void
  /** Optimistic: drop a person's bookings on those days. */
  applyCancel: (email: string, dates: Day[]) => void
  /** View mode: the desk whose card is open (rendered in-scene, see SeatPopup). */
  seatCard: { id: string } | null
  openSeatCard: (id: string) => void
  closeSeatCard: () => void
  /** Paint tool colour (null = back to the default/theme colour). */
  paintColor: string | null
  setPaintColor: (color: string | null) => void
  /** Recolour wall segments (null = theme default). */
  paintWalls: (ids: string[], color: string | null) => void
  /** Paint the floor of the room containing (x, z); null removes its paint. */
  paintFloor: (x: number, z: number, color: string | null) => void
  /** An in-progress box selection, in client (screen) pixels. */
  box: { x0: number; y0: number; x1: number; y1: number; additive: boolean } | null
  setBox: (box: EditorState["box"]) => void
  /** Furniture currently being carried (rotating it then skips the overlap check). */
  carryingId: string | null
  setCarrying: (id: string | null) => void
  /** Bumped to ask the camera to frame the whole office (see CameraFit). */
  fitNonce: number
  requestFit: () => void

  setTool: (tool: Tool) => void
  select: (id: string | null) => void
  rotatePlacement: () => void
  /** Set (or clear, with null) the placement colour for one object type. */
  setPlacementColor: (type: ObjectType, color: string | null) => void
  /** Manually set the time of day — this stops following the real clock. */
  setTimeOfDay: (hour: number) => void
  /** Follow (or stop following) the real clock; turning on jumps to now. */
  setSyncTime: (on: boolean) => void
  /** Re-read the real clock if syncing (called on mount + every minute). */
  tickClock: () => void
  /** Replace the whole scene (e.g. hydrating from a saved office layout). */
  load: (objects: SceneObject[]) => void

  addObject: (obj: NewObject) => string
  /** Add a run of wall edges, skipping edges that already exist. */
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
  /** Moves a piece; wall items also turn to face out from their new wall. */
  moveObject: (id: string, x: number, z: number, rotation?: number) => void
  rotateObject: (id: string) => void
  setColor: (id: string, color: string) => void
  /** Gives each piece its next look (props, cushions…). */
  shuffleLook: (ids: string[]) => void
  removeObject: (id: string) => void
  duplicateObject: (id: string) => void
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
  clear: () => void

  // ---- Undo / redo (history of `objects` snapshots; see createEditorStore) ----
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

/** Max undo steps kept. */
const HISTORY_LIMIT = 100

const makeInitializer =
  (initialObjects: SceneObject[]): StateCreator<EditorState> =>
  (rawSet, get) => {
    // Per-store history bookkeeping (not state: not rendered, not persisted).
    const history: HistoryInternals = { applying: false, batch: null }
    // Every change to `objects` made through `set` becomes an undo step — so
    // all actions are undoable with no per-action code — except while undo/redo
    // applies a snapshot or a batch is open. (Persist rehydration uses the store
    // API directly, so it's never recorded.)
    const set: typeof rawSet = (partial, replace?: boolean) => {
      const before = get().objects
      ;(rawSet as (p: typeof partial, r?: boolean) => void)(partial, replace)
      const after = get().objects
      syncSelection()
      if (after === before || history.applying || history.batch) return
      rawSet({ past: [...get().past, before].slice(-HISTORY_LIMIT), future: [] })
    }
    // One place keeps multi-select consistent with the (many) actions that set
    // `selectedId`: drop ids that no longer exist; selectedId ∈ selection.
    const syncSelection = () => {
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
        const copies = src.map((o) => ({
          ...o,
          id: nanoid(8),
          x: o.x + dx,
          z: o.z + dz,
          variant: undefined,
        }))
        if (!groupCollides([...get().objects, ...copies], copies)) return copies
      }
      return null
    }
    return {
      objects: initialObjects,
      selectedId: null,
      selection: [],
      clipboard: [],
      tool: "select",
      placementRotation: 0,
      placementColors: {},
      // Server-safe default; the real time is applied on mount (client clock + TZ).
      timeOfDay: 13,
      syncTime: true,
      view: readViewPref(),
      setView: (view) => {
        writePref(VIEW_KEY, view)
        set({ view })
      },
      measureHints: readMeasurePref(),
      toggleMeasureHints: () =>
        set((s) => {
          writeMeasurePref(!s.measureHints)
          return { measureHints: !s.measureHints }
        }),
      setSeatLabel: (id, label) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, label: label.trim() || undefined } : o
          ),
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
          const taken = new Set(s.objects.map((o) => o.label).filter(Boolean))
          const unlabelled = s.objects
            .filter((o) => isSeatable(o.type) && !o.label)
            .sort((a, b) => a.z - b.z || a.x - b.x)
          if (unlabelled.length === 0) return s
          const labels = new Map<string, string>()
          let n = 1
          for (const o of unlabelled) {
            while (taken.has(`D-${n}`)) n++
            labels.set(o.id, `D-${n}`)
            taken.add(`D-${n}`)
          }
          return {
            objects: s.objects.map((o) =>
              labels.has(o.id) ? { ...o, label: labels.get(o.id) } : o
            ),
          }
        }),
      booking: NO_BOOKING,
      setBooking: (patch) => set((s) => ({ booking: { ...s.booking, ...patch } })),
      setBookingDay: (day) => set((s) => ({ booking: { ...s.booking, day } })),
      applyReserve: (deskId, email, dates) =>
        set((s) => {
          const byDay = { ...s.booking.byDay }
          for (const d of dates) {
            const day = { ...byDay[d] }
            if (day[deskId] && day[deskId] !== email) continue // taken: the server reports it
            for (const k of Object.keys(day)) if (day[k] === email) delete day[k]
            day[deskId] = email
            byDay[d] = day
          }
          return { booking: { ...s.booking, byDay } }
        }),
      applyCancel: (email, dates) =>
        set((s) => {
          const byDay = { ...s.booking.byDay }
          for (const d of dates) {
            const day = { ...byDay[d] }
            for (const k of Object.keys(day)) if (day[k] === email) delete day[k]
            byDay[d] = day
          }
          return { booking: { ...s.booking, byDay } }
        }),
      seatCard: null,
      openSeatCard: (id) => set({ seatCard: { id } }),
      closeSeatCard: () => set({ seatCard: null }),
      paintColor: "#c9b48d",
      setPaintColor: (paintColor) => set({ paintColor }),
      paintWalls: (ids, color) => {
        const set_ = new Set(ids)
        set((s) => ({
          objects: s.objects.map((o) => (set_.has(o.id) ? { ...o, color: color ?? undefined } : o)),
        }))
      },
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
      box: null,
      setBox: (box) => set({ box }),
      carryingId: null,
      setCarrying: (carryingId) => set({ carryingId }),
      fitNonce: 0,
      requestFit: () => set((s) => ({ fitNonce: s.fitNonce + 1 })),

      setTool: (tool) => set({ tool, selectedId: tool === "select" ? get().selectedId : null }),
      select: (selectedId) => set({ selectedId }),
      rotatePlacement: () =>
        set((s) => ({ placementRotation: (s.placementRotation + HALF_TURN) % (Math.PI * 2) })),
      setPlacementColor: (type, color) =>
        set((s) => {
          const placementColors = { ...s.placementColors }
          if (color === null) delete placementColors[type]
          else placementColors[type] = color
          return { placementColors }
        }),
      setTimeOfDay: (hour) => set({ timeOfDay: ((hour % 24) + 24) % 24, syncTime: false }),
      setSyncTime: (on) =>
        set(on ? { syncTime: true, timeOfDay: nowHours() } : { syncTime: false }),
      tickClock: () => {
        if (get().syncTime) set({ timeOfDay: nowHours() })
      },
      load: (objects) => set({ objects: normalizeEdges(objects), selectedId: null }),

      addObject: ({ type, x, z, rotation = 0, color, model }) => {
        // Don't place furniture inside existing furniture.
        if (furnitureCollides(get().objects, type, x, z, rotation)) return ""
        const id = nanoid(8)
        set((s) => ({ objects: [...s.objects, { id, type, x, z, rotation, color, model }] }))
        return id
      },

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
            { ...plan.add[0], id: o.id, color: o.color },
          ],
          selectedId: o.id,
        })
        return true
      },

      moveObject: (id, x, z, rotation) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, x, z, rotation: rotation ?? o.rotation } : o
          ),
        })),

      shuffleLook: (ids) =>
        set((s) => ({
          objects: s.objects.map((o) =>
            ids.includes(o.id) ? { ...o, variant: (variantOf(o) + 1) % 1000 } : o
          ),
        })),

      rotateObject: (id) =>
        set((s) => {
          const o = s.objects.find((obj) => obj.id === id)
          // Walls/doors live on grid edges — turning one in place would leave it
          // off the edge grid, so they don't rotate.
          if (!o || isEdgeType(o.type)) return s
          const rotation = (o.rotation + HALF_TURN) % (Math.PI * 2)
          // An odd×even footprint changes parity when turned; re-snap so it still
          // sits on whole grid squares, and refuse a turn into other furniture —
          // unless it's being carried (the overlap is checked on drop).
          const p = clampToFloor(o.type, rotation, snapToFootprint(o.type, rotation, o.x, o.z))
          const carrying = s.carryingId === id
          if (!carrying && furnitureCollides(s.objects, o.type, p.x, p.z, rotation, o.id)) return s
          return {
            objects: s.objects.map((obj) => (obj.id === id ? { ...obj, ...p, rotation } : obj)),
          }
        }),

      setColor: (id, color) =>
        set((s) => ({
          objects: s.objects.map((o) => (o.id === id ? { ...o, color } : o)),
        })),

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
          const rotation = (o.rotation + HALF_TURN) % (Math.PI * 2)
          return { ...o, ...snapToFootprint(o.type, rotation, o.x, o.z), rotation }
        })
        if (groupCollides(get().objects, turned)) return
        const byId = new Map(turned.map((o) => [o.id, o]))
        set((s) => ({ objects: s.objects.map((o) => byId.get(o.id) ?? o) }))
      },
      colorSelection: (color) => {
        const ids = new Set(get().selection)
        set((s) => ({ objects: s.objects.map((o) => (ids.has(o.id) ? { ...o, color } : o)) }))
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

      removeObject: (id) =>
        set((s) => ({
          objects: dropOrphanMounts(s.objects.filter((o) => o.id !== id)),
          selectedId: s.selectedId === id ? null : s.selectedId,
        })),

      duplicateObject: (id) =>
        set((s) => {
          const src = s.objects.find((o) => o.id === id)
          // Only furniture duplicates (a copied wall edge would be a stray segment).
          if (!src || isEdgeType(src.type)) return s
          // Drop the copy on the nearest free spot beside/around the original.
          const offsets = [1, 2, 3].flatMap((d) => [
            [d, 0],
            [0, d],
            [-d, 0],
            [0, -d],
            [d, d],
            [-d, -d],
            [d, -d],
            [-d, d],
          ])
          for (const [dx, dz] of offsets) {
            const p = clampToFloor(src.type, src.rotation, { x: src.x + dx, z: src.z + dz })
            if (furnitureCollides(s.objects, src.type, p.x, p.z, src.rotation)) continue
            const clone: SceneObject = { ...src, id: nanoid(8), ...p, variant: undefined }
            return { objects: [...s.objects, clone], selectedId: clone.id }
          }
          return s
        }),

      clear: () => set({ objects: [], selectedId: null }),

      past: [],
      future: [],
      // Recording happens in a store subscription (createEditorStore); these
      // actions only move snapshots between the stacks.
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
          selectedId: prev.some((o) => o.id === selectedId) ? selectedId : null,
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
          selectedId: next.some((o) => o.id === selectedId) ? selectedId : null,
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
    .sort((a, b) => a.x - b.x || a.z - b.z || a.type.localeCompare(b.type))

export type EditorStore = StoreApi<EditorState>

interface CreateEditorStoreOptions {
  /** localStorage key (standalone editor). Omit for DB-backed offices. */
  persistKey?: string
  /** Scene the store is born with (an office's saved layout), avoiding any load race. */
  initialObjects?: SceneObject[]
}

/**
 * Create a fresh, isolated editor store — each editor instance gets its own, so
 * offices never share scene data. The store starts already populated with
 * `initialObjects` (no post-mount hydration, no empty-render race).
 */
export const createEditorStore = ({
  persistKey,
  initialObjects = [],
}: CreateEditorStoreOptions = {}): EditorStore => {
  const initializer = makeInitializer(normalizeEdges(initialObjects))
  return persistKey
    ? createStore<EditorState>()(
        persist(initializer, {
          name: persistKey,
          // Only the layout is durable — tool/selection are per-session.
          partialize: (s) => ({ objects: s.objects }),
          // Upgrade layouts saved with old 1-unit wall segments.
          merge: (persisted, current) => {
            const p = persisted as Partial<EditorState> | undefined
            return { ...current, ...p, objects: normalizeEdges(p?.objects ?? current.objects) }
          },
        })
      )
    : createStore<EditorState>()(initializer)
}

const EditorStoreContext = createContext<EditorStore | null>(null)

/** Provides a store instance to the editor subtree (and, bridged, into the Canvas). */
export const EditorStoreContextProvider = EditorStoreContext.Provider

export function useEditorStore<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorStoreContext)
  if (!store) throw new Error("useEditorStore must be used within an OfficeEditor")
  return useStore(store, selector)
}

export function useEditorStoreApi(): EditorStore {
  const store = useContext(EditorStoreContext)
  if (!store) throw new Error("useEditorStoreApi must be used within an OfficeEditor")
  return store
}
