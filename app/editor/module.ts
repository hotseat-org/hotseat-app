import type { ComponentType, ReactNode, RefObject } from "react"
import type { LucideIcon } from "lucide-react"
import type { CategoryDefinition } from "./catalog/categories"
import type { ItemWithLooks } from "./catalog/renderers"
import type { Frame } from "./plan/useFraming"
import type { View } from "./plan/planView"
import type { EditorState, GetState, SetState } from "./store/state"
import type { SceneObject } from "./types"
import type { Command } from "./ui/menus/commands"
import type { Translator } from "~/i18n/translate"

/**
 * An editor module: what it adds to an editor instance (see office/module.ts)
 * — the items it brings, and its behaviour.
 */
export interface EditorModule {
  id: string
  /** The items it adds to the catalogue: registered when an editor starts with it. */
  catalog?: ModuleCatalog
  /**
   * Takes in what the app passes it (`moduleData[id]` on the Editor) — run as
   * a hook inside the editor, to mirror the app's data into the store. (A
   * method, so a module's hook may take its own data type.)
   */
  useData?(data: unknown): void
  /**
   * Its part of the store: the state and actions it adds (typed through
   * defineModule; read with getModuleStoreHooks). A method, so a module's
   * part may see its own state.
   */
  createState?(set: SetState, get: GetState): object
  /**
   * New pieces — placed, pasted, duplicated, from a saved room — before they
   * join `existing`: what they keep of what they were copied from (a copied
   * desk gets its own label, and no resident).
   */
  prepareNewPieces?: (existing: SceneObject[], fresh: SceneObject[]) => SceneObject[]
  /** What it draws in the 3D scene, and when. */
  sceneLayers?: SceneLayer[]
  /**
   * A hook: how it sees each piece right now (the office: someone's at this
   * desk on the shown day) — null when it has nothing to say. Pieces take
   * their look from it (a lived-in desk, its lamp on).
   */
  usePieceStates?: (isViewing: boolean) => ReadonlyMap<string, PieceState> | null
  /**
   * A hook: a word on each floor, by floor id (the office: "6 free" on the
   * shown day) — null when it has nothing to say. Shown with the floors
   * while viewing.
   */
  useFloorNotes?: () => ReadonlyMap<string, FloorNote> | null
  /** A hook: what clicks do while viewing (the office: a desk opens its card). */
  useViewClicks?: () => ViewClicks
  /** What it adds to the simple (2D) plan. */
  plan?: PlanModule
  /** Its panels over the editor (HTML), and when. */
  panels?: Panel[]
  /**
   * A hook: a check before autosaving (the office: a change that would take
   * bookings away waits for the admin's choice). See SaveGuard.
   */
  useSaveGuard?: (autosave: AutosaveControls) => SaveGuard
  /** Its commands (the command search; `isOnFloorMenu` ones on the floor's right-click menu too). */
  commands?: Command[]
  /** Its sections in the Inspector (editing), for the selection. */
  inspectorSections?: ComponentType<InspectorSectionProps>[]
  /** Its layers in the Map menu: switches only (shown or hidden, remembered in the browser). */
  mapLayers?: MapLayer[]
  /** Its panels beside the rail, each opened from its own button (the notes, the desk filter). */
  sidePanels?: SidePanel[]
  /** What it adds to the bottom bar, before the time of day (the office: the day). */
  bottomBarItems?: ComponentType[]
  /**
   * What matters about some pieces, in a few words — a room's, a saved
   * room's, a template's (the office: "8 desks"); null when nothing does.
   */
  describePieces?: (objects: SceneObject[], translator: Translator) => string | null
  /** What an empty layout shows (the office: start from a template). */
  EmptyState?: ComponentType<EmptyStateProps>
}

/** A layer of the map: shown or hidden from the Map menu. */
/**
 * A module, typed with the state it adds: `set` and `get` see the
 * editor's state with it, and `createState` returns it whole.
 */
export const defineModule = <State extends object>(
  module: Omit<EditorModule, "createState"> & {
    createState?: (set: SetState<EditorState & State>, get: GetState<EditorState & State>) => State
  }
): EditorModule => module

/**
 * What a module adds to the catalogue: its items, each with its looks, and
 * the categories they're offered in (after the editor's own). Items are
 * app-wide: where the server needs their traits (no editor there), register
 * them there too, headless (`registerItems` from ~/editor/core).
 */
export interface ModuleCatalog {
  items?: Record<string, ItemWithLooks>
  categories?: CategoryDefinition[]
}

export interface MapLayer {
  id: string
  /** Translatable (msg). */
  label: string
  hint: string
  icon: LucideIcon
  when: "viewing" | "editing" | "always"
  isOnByDefault: boolean
  /** A hint instead, for this layout (the Zones layer, with none yet). */
  hintFor?: (objects: SceneObject[]) => string | null
}

/**
 * A panel of its own beside the rail — a feature's list or tool (the notes,
 * the desk filter) — opened from its button; one is open at a time. Editing:
 * in the catalogue's rail; viewing: in the app shell's rail (or the phone's
 * dock, as a sheet).
 */
export interface SidePanel {
  id: string
  /** Its button's name and its title, translatable (msg). */
  label: string
  icon: LucideIcon
  when: "viewing" | "editing" | "always"
  Component: ComponentType<SidePanelProps>
  /** A hook: whether it has anything to offer now (unset: always). */
  useIsShown?: (isEditing: boolean) => boolean
  /** A hook: a count on its button, e.g. filters on (unset or 0: none). */
  useBadgeCount?: () => number
}

export interface SidePanelProps {
  isEditing: boolean
  /** Close it (after picking something that needs the view). */
  close: () => void
}

export interface EmptyStateProps {
  /** May this person lay the office out? */
  canEdit: boolean
  /** Viewing (picking anything drops into editing first). */
  readOnly: boolean
  /** Whether the editor can open here (not on a phone, or without WebGL). */
  isEditable: boolean
  onEnterEdit: () => void
  /** Start from a blank floor: dismiss the empty state. */
  onDismiss: () => void
}

export interface InspectorSectionProps {
  /** The primary selected piece. */
  selected: SceneObject
  /** How many pieces are selected. */
  count: number
}

/** A module's panel over the editor, shown while viewing, editing, or always. */
export interface Panel {
  Component: ComponentType<PanelProps>
  when: "viewing" | "editing" | "always"
}

export interface PanelProps {
  isViewing: boolean
  isMobile: boolean
  isDark: boolean
}

/**
 * What a save sends along besides the layout — modules add their own
 * (`declare module`: the office's shouldRehome).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SaveOptions {}

/** What a save guard can do with the editor's autosave. */
export interface AutosaveControls {
  /** Autosave is on (the layout saves somewhere — a real office). */
  isEnabled: boolean
  /** Every floor's pieces, as they are now. */
  pieces: SceneObject[]
  /** Every floor's pieces, as last saved. */
  getSavedPieces: () => SceneObject[]
  /** Save the current layout now, with these options. */
  saveNow: (options?: SaveOptions) => void
  /** Put the layout back as last saved. */
  revert: () => void
}

/** A module's check before autosaving. */
export interface SaveGuard {
  /** Hold autosaving (and leaving's flush) until the module lets go. */
  isHolding: boolean
  /** What it shows meanwhile (its question), over the editor. */
  panel: ReactNode
}

/** A module's part in the 2D plan (shown while viewing; the plan turns the layout, see planView). */
export interface PlanModule {
  /**
   * A hook: how each piece is drawn — given the plan's turned layout. Its
   * result goes into the memoized drawing: keep it stable (useMemo).
   */
  usePieceStyles?: (objects: SceneObject[]) => (object: SceneObject) => PlanPieceStyle | undefined
  /** A hook: SVG drawn with the plan's drawing (plan units). Keep it stable (useMemo). */
  useDrawings?: (context: PlanDrawingContext) => PlanDrawings
  /** Drawn in the plan's SVG over its drawing, re-rendered with the view (plan units). */
  svgLayers?: ComponentType<PlanLayerProps>[]
  /** HTML laid over the plan (screen pixels). */
  overlays?: ComponentType<PlanLayerProps>[]
}

/** How a piece is drawn on the plan. */
export interface PlanPieceStyle {
  /** Its symbol's lived-in state (a desk: someone's there); unset, as when editing. */
  isOccupied?: boolean
  /** Faded far back (filtered out). */
  isDimmed?: boolean
  /** Blended toward the floor, so the pieces that matter stand out. */
  isMuted?: boolean
}

export interface PlanDrawingContext {
  /** The plan's turned layout. */
  objects: SceneObject[]
  isDark: boolean
  /** Unique per plan: name SVG ids after it. */
  idPrefix: string
  /** A piece clicked in the drawing (not the end of a pan). */
  onPiece: (id: string) => void
}

export interface PlanDrawings {
  /** On the floor, under the pieces. */
  floor?: ReactNode
  /** Over the pieces. */
  top?: ReactNode
}

/** What the plan's layers and overlays are given. */
export interface PlanLayerProps {
  plan: PlanState
}

export interface PlanState {
  view: View
  /** The layout turned by this many quarter turns (see turnPoint). */
  turn: number
  /** The plan's turned layout. */
  objects: SceneObject[]
  isDark: boolean
  /** A plan point (turned) on screen, in px within the plan. */
  screen: (x: number, z: number) => { left: number; top: number }
  /** The press that's ending was a pan, not a click. */
  isMoved: () => boolean
  /** Glide the view (instant with reduced motion). */
  glideTo: (from: View, to: View) => void
  viewRef: RefObject<View | null>
  frame: RefObject<Frame>
  /** A phone: what its shell covers (px), else undefined. */
  phoneChrome?: { top: number; bottom: number }
}

/** A module's own scene component, shown while viewing, editing, or always. */
export interface SceneLayer {
  Component: ComponentType<SceneLayerProps>
  when: "viewing" | "editing" | "always"
}

export interface SceneLayerProps {
  isEditing: boolean
  isDark: boolean
}

/** How a module sees a piece right now. */
export interface PieceState {
  /** Someone's here: the lived-in look (a desk's clutter, its monitor on). */
  isOccupied?: boolean
}

/** What a module says about a floor, beside its name. */
export interface FloorNote {
  /** A few words ("6 free"). */
  text: string
  /** Good news, or a warning (full). */
  tone: "positive" | "warning"
  /** What of yours is there, in words (the office: "your desk", on the shown day). */
  yours?: string
}

/** What clicks do while viewing. */
export interface ViewClicks {
  /** Whether a piece answers a click (a pointer cursor over it). */
  isClickable?: (object: SceneObject) => boolean
  onPiece?: (id: string) => void
  /** A click on the bare floor (not the end of a camera drag). */
  onFloor?: () => void
}
