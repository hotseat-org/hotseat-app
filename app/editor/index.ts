/**
 * The editor's API for modules and integrators: the module contract, the
 * store a module reads and adds to, and the editor UI an app may reuse.
 * Without three.js (the 3D scene loads lazily), so app shells rendered on
 * the server can import it. See core.ts for the other entry points.
 */

// A module: the slots it fills (see module.ts).
export { defineModule } from "./module"
export type {
  AutosaveControls,
  EditorModule,
  EmptyStateProps,
  FloorNote,
  InspectorSectionProps,
  MapLayer,
  Panel,
  PanelProps,
  PieceState,
  PlanDrawingContext,
  PlanDrawings,
  PlanLayerProps,
  PlanModule,
  PlanPieceStyle,
  PlanState,
  SaveGuard,
  SaveOptions,
  SceneLayer,
  SceneLayerProps,
  SidePanel,
  SidePanelProps,
  ViewClicks,
} from "./module"
export { GROUP, selectAll, type Command } from "./ui/menus/commands"
export type { TourStep } from "./ui/guide/GuidedTour"

// The store: the layout, the editor's state and each module's own.
export {
  createEditorStore,
  getAllPieces,
  getModuleStoreHooks,
  useAllPieces,
  useEditorStore,
  useEditorStoreApi,
  type EditorState,
  type EditorStore,
} from "./store"
export type { GetState, SetState } from "./store/state"

// How the catalogue's items look and where they're listed.
export {
  composeItemsWithLooks,
  getTiles,
  registerRenderers,
  type ItemRenderer,
  type ItemTile,
  type ItemWithLooks,
  type MeshProps,
} from "./catalog/renderers"
export {
  getCategories,
  registerCategories,
  type Category,
  type CategoryDefinition,
} from "./catalog/categories"
export {
  BathroomIcon,
  DecorIcon,
  DesksIcon,
  EquipmentIcon,
  KitchenIcon,
  OnTheWallIcon,
  SeatingIcon,
  StorageIcon,
  TablesIcon,
} from "./ui/catalog/categoryIcons"

// Around the editor: its error boundary and whether 3D can run at all.
export { EditorBoundary } from "./shell/EditorBoundary"
export { hasWebGL } from "./shell/webgl"

// Side panels in an app shell's own rail or dock (viewing).
export {
  SidePanelBadge,
  SidePanelFlyout,
  useSidePanels,
  type SidePanelEntry,
} from "./ui/sidePanels"

// Editor UI an app shell may reuse (the office view's dock and map menu).
export { TimeOfDay } from "./ui/bars/TimeOfDay"
export { InspectorGroup } from "./ui/InspectorGroup"
export { REVEAL_LABEL } from "./ui/bars/revealLabel"
export { MapLayerSwitches, MapMenu, useMapLayerRows } from "./ui/menus/MapMenu"
