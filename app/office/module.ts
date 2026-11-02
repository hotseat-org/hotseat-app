import { FURNITURE, FURNITURE_CATEGORIES } from "./catalog/furniture.render"
import "./slots/objectFields"
import { useFloorNotes } from "./booking/useBooking"
import { useOfficePieceStyles, useOfficePlanDrawings } from "./plan/drawings"
import { OfficePlanOverlays, OfficeRoutePath } from "./plan/layers"
import { OFFICE_SCENE_LAYERS, useOfficePieceStates, useOfficeViewClicks } from "./scene/layers"
import { OFFICE_COMMANDS } from "./slots/commands"
import { OfficeInspectorSection } from "./slots/inspector"
import { OfficeEmptyState } from "./slots/emptyState"
import { OfficeDay, describeDesks, prepareNewOfficePieces } from "./slots/extras"
import { OFFICE_MAP_LAYERS } from "./slots/mapLayers"
import { OFFICE_SIDE_PANELS } from "./slots/sidePanels"
import { OFFICE_PANELS } from "./slots/panels"
import { useLayoutImpactGuard } from "./slots/saveGuard"
import { createOfficeState, type OfficeState } from "./store"
import { useOfficeData } from "./useOfficeData"
import { defineModule } from "~/editor"

/**
 * The office: bookable desks on top of the editor — their labels, residents,
 * zones and features, booking them by day, and what the map shows about them.
 */
export const officeModule = defineModule<OfficeState>({
  id: "office",
  catalog: { items: FURNITURE, categories: FURNITURE_CATEGORIES },
  useData: useOfficeData,
  createState: createOfficeState,
  prepareNewPieces: prepareNewOfficePieces,
  sceneLayers: OFFICE_SCENE_LAYERS,
  usePieceStates: useOfficePieceStates,
  useViewClicks: useOfficeViewClicks,
  useFloorNotes,
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
  sidePanels: OFFICE_SIDE_PANELS,
  bottomBarItems: [OfficeDay],
  describePieces: describeDesks,
  EmptyState: OfficeEmptyState,
})
