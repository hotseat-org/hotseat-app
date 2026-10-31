/**
 * The editor's API for modules and integrators: the module contract, the
 * store a module reads and adds to, and the editor UI an app may reuse.
 * Without three.js (the 3D scene loads lazily), so app shells rendered on
 * the server can import it. See core.ts for the other entry points.
 */

// A module: the slots it fills (see module.ts).
export type {
  AutosaveControls,
  EditorModule,
  EmptyStateProps,
  InspectorSectionProps,
  MapLayer,
  MapMenuSection,
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
  ViewClicks,
} from "./module"
export { GROUP, selectAll, type Command } from "./ui/menus/commands"
export type { TourStep } from "./ui/guide/GuidedTour"

// The store: the layout, the editor's state and each module's slice.
export {
  createEditorStore,
  useEditorStore,
  useEditorStoreApi,
  type EditorState,
  type EditorStore,
} from "./store"
export type { GetState, SetState } from "./store/state"

// How the catalogue's kinds look and where they're listed.
export { registerRenderers, type ItemRenderer, type MeshProps } from "./catalog/renderers"
export { registerCategories, type CategoryDefinition } from "./catalog/categories"
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

// Editor UI an app shell may reuse (the office view's dock and map menu).
export { TimeOfDay } from "./ui/bars/TimeOfDay"
export { REVEAL_LABEL } from "./ui/bars/revealLabel"
export { MapMenu } from "./ui/menus/MapMenu"
