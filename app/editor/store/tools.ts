import type { Kit } from "../kits/kits"
import { ROTATION_STEP, toRotationStep, type PlacementPattern, type WallPaint } from "../layout"
import type { ObjectType, Tool } from "../types"
import type { GetState, SetState } from "./state"

/** The active tool and its settings: placing, painting, carrying. */
export interface ToolsState {
  tool: Tool
  setTool: (tool: Tool) => void
  /** Rotation applied to the next placed object (ephemeral, not persisted). */
  placementRotation: number
  rotatePlacement: () => void
  /** Per-type placement colour; a missing entry means the type's default. */
  placementColors: Partial<Record<ObjectType, string>>
  /** Set (or clear, with null) the placement colour for one object type. */
  setPlacementColor: (type: ObjectType, color: string | null) => void
  /** One piece per click, or a row / back-to-back pod per drag (furniture tools). */
  placementPattern: PlacementPattern
  setPlacementPattern: (pattern: PlacementPattern) => void
  /** Paint tool colour (null = back to the default/theme colour). */
  paintColor: string | null
  setPaintColor: (color: string | null) => void
  /**
   * The walls (or faces) the Paint tool hovers and its colour: shown on the
   * walls themselves (see useObjectsWithPaintPreview), never saved.
   */
  paintPreview: { targets: WallPaint[]; color: string | null } | null
  setPaintPreview: (preview: ToolsState["paintPreview"]) => void
  /** A saved room being placed (the Select tool, with its ghost on the cursor). */
  armedKit: Kit | null
  armKit: (kit: Kit | null) => void
  /** Furniture currently being carried (rotating it then skips the overlap check). */
  carryingId: string | null
  setCarrying: (id: string | null) => void
}

export const createToolsState = (set: SetState, get: GetState): ToolsState => ({
  tool: "select",
  setTool: (tool) =>
    set({ tool, selectedId: tool === "select" ? get().selectedId : null, armedKit: null }),
  placementRotation: 0,
  rotatePlacement: () =>
    set((state) => ({
      placementRotation: toRotationStep(state.placementRotation + ROTATION_STEP),
    })),
  placementColors: {},
  setPlacementColor: (type, color) =>
    set((state) => {
      const placementColors = { ...state.placementColors }
      if (color === null) delete placementColors[type]
      else placementColors[type] = color

      return { placementColors }
    }),
  placementPattern: "single",
  setPlacementPattern: (placementPattern) => set({ placementPattern }),
  paintColor: "#c9b48d",
  setPaintColor: (paintColor) => set({ paintColor }),
  paintPreview: null,
  setPaintPreview: (paintPreview) => set({ paintPreview }),
  armedKit: null,
  armKit: (armedKit) => set({ armedKit, tool: "select", selectedId: null }),
  carryingId: null,
  setCarrying: (carryingId) => set({ carryingId }),
})
