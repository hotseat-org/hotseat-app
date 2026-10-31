import { FURNITURE_ITEMS } from "./catalog/furniture"
import { FURNITURE_CATEGORIES, FURNITURE_RENDERERS } from "./catalog/furniture.render"
import "./slots/objectFields"
import { useOfficePieceStyles, useOfficePlanDrawings } from "./plan/drawings"
import { OfficePlanOverlays, OfficeRoutePath } from "./plan/layers"
import { OFFICE_SCENE_LAYERS, useOfficePieceStates, useOfficeViewClicks } from "./scene/layers"
import { OFFICE_COMMANDS } from "./slots/commands"
import { OfficeInspectorSection } from "./slots/inspector"
import { OfficeEmptyState } from "./slots/emptyState"
import { OfficeDay, describeDesks, prepareNewOfficePieces } from "./slots/extras"
import { OFFICE_MAP_LAYERS, OFFICE_MAP_MENU_SECTION } from "./slots/mapLayers"
import { OFFICE_PANELS } from "./slots/panels"
import { OFFICE_TOUR_STEPS } from "./slots/tourSteps"
import { useLayoutImpactGuard } from "./slots/saveGuard"
import { createOfficeSlice } from "./store"
import { useOfficeData } from "./useOfficeData"
import { type EditorModule } from "~/editor"

/**
 * The office: bookable desks on top of the editor — their labels, residents,
 * zones and features, booking them by day, and what the map shows about them.
 */
export const officeModule: EditorModule = {
  id: "office",
  catalog: {
    items: FURNITURE_ITEMS,
    renderers: FURNITURE_RENDERERS,
    categories: FURNITURE_CATEGORIES,
  },
  useData: useOfficeData,
  createSlice: createOfficeSlice,
  prepareNewPieces: prepareNewOfficePieces,
  sceneLayers: OFFICE_SCENE_LAYERS,
  usePieceStates: useOfficePieceStates,
  useViewClicks: useOfficeViewClicks,
  plan: {
    usePieceStyles: useOfficePieceStyles,
    useDrawings: useOfficePlanDrawings,
    svgLayers: [OfficeRoutePath],
    overlays: [OfficePlanOverlays],
  },
  panels: OFFICE_PANELS,
  useSaveGuard: useLayoutImpactGuard,
  commands: OFFICE_COMMANDS,
  inspectorSections: [OfficeInspectorSection],
  mapLayers: OFFICE_MAP_LAYERS,
  mapMenuSection: OFFICE_MAP_MENU_SECTION,
  bottomBarItems: [OfficeDay],
  tourSteps: OFFICE_TOUR_STEPS,
  describePieces: describeDesks,
  EmptyState: OfficeEmptyState,
}
