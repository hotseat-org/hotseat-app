import type { EditorModule } from "../editor/module"
import "./objectFields"
import { useOfficePieceStyles, useOfficePlanDrawings } from "./plan"
import { OfficePlanOverlays, OfficeRoutePath } from "./planOverlays"
import { OFFICE_SCENE_LAYERS, useOfficePieceStates, useOfficeViewClicks } from "./scene"
import { OFFICE_COMMANDS } from "./commands"
import { OfficeInspectorSection } from "./inspector"
import { OfficeEmptyState } from "./emptyState"
import { OfficeDay, describeDesks, prepareNewOfficePieces } from "./extras"
import { OFFICE_MAP_LAYERS, OFFICE_MAP_MENU_SECTION } from "./mapLayers"
import { OFFICE_PANELS } from "./panels"
import { OFFICE_TOUR_STEPS } from "./tourSteps"
import { useLayoutImpactGuard } from "./saveGuard"
import { createOfficeSlice } from "./store"

/**
 * The office: bookable desks on top of the editor — their labels, residents,
 * zones and features, booking them by day, and what the map shows about them.
 */
export const officeModule: EditorModule = {
  id: "office",
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
