import type { EditorModule } from "../editor/module"
import "./objectFields"
import { useOfficePieceStyles, useOfficePlanDrawings } from "./plan"
import { OfficePlanOverlays, OfficeRoutePath } from "./planOverlays"
import { OFFICE_SCENE_LAYERS, useOfficePieceStates, useOfficeViewClicks } from "./scene"
import { OFFICE_PANELS } from "./panels"
import { useLayoutImpactGuard } from "./saveGuard"
import { asNewDesks, createOfficeSlice } from "./store"

/**
 * The office: bookable desks on top of the editor — their labels, residents,
 * zones and features, booking them by day, and what the map shows about them.
 */
export const officeModule: EditorModule = {
  id: "office",
  createSlice: createOfficeSlice,
  prepareNewPieces: asNewDesks,
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
}
