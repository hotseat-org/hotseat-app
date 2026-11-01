import { Button } from "@heroui/react"
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useTheme } from "remix-themes"
import { Check, Pencil } from "lucide-react"
import {
  EditorStoreContextProvider,
  createEditorStore,
  useEditorStore,
  useEditorStoreApi,
  type EditorStore,
} from "./store"
import type { Layout } from "./floors"
import type { FrameStats } from "./scene/FpsMeter"
import { Catalog } from "./ui/catalog/Catalog"
import { Inspector } from "./ui/Inspector"
import { TopBar } from "./ui/bars/TopBar"
import { TimeOfDay } from "./ui/bars/TimeOfDay"
import { SidePanelRail } from "./ui/sidePanels"
import { FloorPlan } from "./plan/FloorPlan"
import { ControlsGuide, type GuideView } from "./ui/guide/ControlsGuide"
import { SceneLoading } from "./ui/SceneLoading"
import { CommandSearch } from "./ui/menus/CommandSearch"
import { composeCommands } from "./ui/menus/commands"
import { ContextMenu } from "./ui/menus/ContextMenu"
import { GuidedTour } from "./ui/guide/GuidedTour"
import { MapControls } from "./ui/menus/MapControls"
import { FloorPicker } from "./ui/menus/FloorPicker"
import { KitLibraryContext, type KitLibrary } from "./kits/kits"
import { FrameRateReadout } from "./shell/FrameRateReadout"
import { SelectionBox } from "./shell/SelectionBox"
import { useAutosave } from "./shell/useAutosave"
import { useEditorMode, type Mode } from "./shell/useEditorMode"
import { useEditorShortcuts } from "./shell/useEditorShortcuts"
import type { EditorModule, SaveOptions } from "./module"
import { ModulesContext, useModules } from "./modules"
import { ContourBackdrop } from "~/components/ui/ContourBackdrop"

// three.js and the whole scene: their own chunk, loaded apart from the editor.
const loadSceneCanvas = () => import("./scene/SceneCanvas")
// Where the 3D view is likely (not a phone, which shows the plan), its code
// starts loading with the editor's, instead of when it first renders.
if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches)
  void loadSceneCanvas()

const SceneCanvas = lazy(loadSceneCanvas)

export interface EditorProps {
  /** The modules this editor runs with (fixed for its life). */
  modules: EditorModule[]
  /** When provided, the editor loads/saves this layout instead of localStorage. */
  initialLayout?: Layout
  /** Without `onSave`: the localStorage key the layout is kept under. */
  persistKey?: string
  /**
   * Called (debounced) with the current scene whenever it changes, and with
   * what the modules' save guards send along (see SaveOptions).
   */
  onSave?: (layout: Layout, options?: SaveOptions) => void
  /** The organization's saved rooms (a real office); without it, this browser's. */
  kitLibrary?: KitLibrary
  /** Whether a save is currently in flight (for the indicator). */
  saving?: boolean
  /** The last save failed (shown in the top bar; the route retries). */
  saveFailed?: boolean
  /** Resubmit the latest layout now. */
  onRetrySave?: () => void
  /** Which mode to open in. */
  initialMode?: Mode
  /** May this person edit the layout? (Admins only in a real office.) Default true. */
  canEdit?: boolean
  /**
   * In display mode, render floating app chrome instead of the built-in view
   * toggle + time control. Receives `enterEdit` to switch into edit mode. The
   * shell is rendered inside the editor's store provider, so it can read/drive
   * scene state (e.g. time-of-day) via `useEditorStore`.
   */
  displayShell?: (api: {
    enterEdit: () => void
    /** No layout yet (first-run screen): show only the essential chrome. */
    empty: boolean
    /** The camera controls guide, for the shell to place among its panels. */
    guide: ReactNode
  }) => ReactNode
  /** Each module's data from the app, by module id (see EditorModule.useData). */
  moduleData?: Record<string, unknown>
  /** Rendered inside the editor's providers, before it. */
  children?: ReactNode
  /** On a phone with the app's shell: what the shell covers at the top and bottom (px). */
  phoneChrome?: { top: number; bottom: number }
}

/** The office shell's floating panels (desktop): the left rail, the right column. */
const SHELL_INSETS = { left: 100, right: 340 }

/**
 * The editor: a layout in 3D (editing and viewing) and as a 2D plan, with
 * whatever its modules add. Owns a fresh, isolated store for this instance so
 * editors never share scene data. DB-backed instances (with `onSave`) use no
 * localStorage; others persist to `persistKey`.
 */
export const Editor = (props: EditorProps) => {
  // One module list for the editor's life (their hooks are called in order).
  const [modules] = useState(() => props.modules)
  const storeRef = useRef<EditorStore>(undefined)
  if (!storeRef.current) {
    // DB-backed offices are born with their saved layout (no load race); the
    // standalone editor persists to localStorage instead.
    storeRef.current = props.onSave
      ? createEditorStore({ initialLayout: props.initialLayout, modules })
      : createEditorStore({ persistKey: props.persistKey, modules })
  }

  return (
    <EditorStoreContextProvider value={storeRef.current}>
      <ModulesContext.Provider value={modules}>
        <KitLibraryContext.Provider value={props.kitLibrary ?? null}>
          <ModuleData data={props.moduleData} />
          {props.children}
          <EditorInner {...props} />
        </KitLibraryContext.Provider>
      </ModulesContext.Provider>
    </EditorStoreContextProvider>
  )
}

/** Hands each module its data from the app (their hooks, in module order). */
const ModuleData = ({ data }: { data?: Record<string, unknown> }) => {
  useModules().forEach((module) => module.useData?.(data?.[module.id]))

  return null
}

const getGuideView = ({
  isFlat,
  isReadOnly,
}: {
  isFlat: boolean
  isReadOnly: boolean
}): GuideView => {
  if (isFlat) return "plan"

  return isReadOnly ? "view" : "edit"
}

const EditorInner = ({
  onSave,
  saving,
  saveFailed,
  onRetrySave,
  initialMode = "edit",
  canEdit = true,
  displayShell,
  phoneChrome,
}: EditorProps) => {
  const store = useEditorStoreApi()

  // The app theme drives the scene's surface palette (dark → deep slate floor,
  // walls + background) while lighting stays bright daylight for visibility.
  const [theme] = useTheme()
  const isDark = theme === "dark"

  // Keep the scene's time of day in step with the real clock (while syncing).
  useEffect(() => {
    const { tickClock } = store.getState()
    tickClock()
    const id = window.setInterval(tickClock, 60_000)

    return () => window.clearInterval(id)
  }, [store])

  const {
    isMobile,
    editable,
    readOnly,
    flat,
    switchMode,
    enterEdit,
    handleSceneReady,
    isFirstLoad,
    isBusy,
    busyLabel,
  } = useEditorMode({ canEdit, initialMode })
  const modules = useModules()
  const commands = useMemo(
    () =>
      composeCommands(
        modules.flatMap((module) => module.commands ?? []),
        () => switchMode("display")
      ),
    [modules, switchMode]
  )
  useEditorShortcuts(readOnly)
  // Editing and viewing have their own side panels: switching starts with none open.
  useEffect(() => store.getState().closeSidePanel(), [readOnly, store])
  const { guardPanels } = useAutosave({ onSave, saveFailed })
  // The modules' panels for the mode.
  // An empty layout's screen: the first module's that has one.
  const EmptyState = modules.find((module) => module.EmptyState)?.EmptyState
  const panels = modules
    .flatMap((module) => module.panels ?? [])
    .filter((panel) => panel.when === "always" || (panel.when === "viewing") === readOnly)

  // Display mode with an app shell: the shell owns the view toggle + time control.
  const shellMode = readOnly && !!displayShell
  // First-run helper for a brand-new (empty) office.
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  // A brand-new office (no layout, first-run card showing): no scene and no
  // editor/scene chrome — only the template card and the app essentials.
  // On any floor: an empty floor of an office is just that floor.
  const hasLayout = useEditorStore(
    (state) => state.objects.length > 0 || state.otherFloorsPieces.length > 0
  )
  const isEmpty = !hasLayout && !emptyDismissed
  // Mouse / trackpad controls: no use on a touch phone.
  const guideView = getGuideView({ isFlat: flat, isReadOnly: readOnly })
  const guide = isMobile ? null : <ControlsGuide view={guideView} />

  // Perf HUD. While on, the Canvas renders continuously (`frameloop="always"`)
  // so the reading reflects a true, comparable FPS instead of only the frames
  // that on-demand rendering happens to produce.
  const isFrameRateShown = useEditorStore((state) => state.isFrameRateShown)
  const [stats, setStats] = useState<FrameStats | null>(null)
  const dbMode = !!onSave
  const modeButton = readOnly ? (
    <Button size="sm" variant="primary" className="min-w-32" onPress={enterEdit}>
      <Pencil className="size-4" /> Edit layout
    </Button>
  ) : (
    <Button size="sm" variant="primary" className="min-w-32" onPress={() => switchMode("display")}>
      <Check className="size-4" strokeWidth={2.5} /> Done
    </Button>
  )

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The scene's own layer: its floating labels and desk card stack inside
          it (isolate), so they never cover the panels and menus above. */}
      <div className="absolute inset-0 isolate">
        {!isEmpty && flat && (
          <FloorPlan
            dark={isDark}
            padRight={shellMode ? 340 : 40}
            phoneChrome={shellMode && isMobile ? phoneChrome : undefined}
          />
        )}
        {!isEmpty && !flat && (
          <Suspense fallback={null}>
            <SceneCanvas
              store={store}
              readOnly={readOnly}
              dark={isDark}
              fitInsets={shellMode && !isMobile ? SHELL_INSETS : undefined}
              showStats={isFrameRateShown}
              onStats={setStats}
              onReady={handleSceneReady}
            />
          </Suspense>
        )}
      </div>
      {/* Above the scene layer (its desk labels too), below the panels. */}
      {!isEmpty && !flat && (
        <SceneLoading isVisible={isBusy} label={busyLabel} isFirstLoad={isFirstLoad} />
      )}

      {/* Empty office: cover the bare 3D scene with the same grid+dots backdrop
          as the empty-org screen (sits below the chrome + template card). */}
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 bg-background">
          <ContourBackdrop />
        </div>
      )}

      {/* DOM overlay — panels re-enable pointer events individually. */}
      <div className="pointer-events-none absolute inset-0">
        <SelectionBox />
        {/* The modules' panels (the office: booking on chosen days, the way to a desk…). */}
        {panels.map(({ Component }, index) => (
          <Component key={index} isViewing={readOnly} isMobile={isMobile} isDark={isDark} />
        ))}

        {/* Right-click menu and the command search (⌘K). */}
        {!readOnly && (
          <>
            <ContextMenu />
            <CommandSearch commands={commands} />
            {!isEmpty && <GuidedTour />}
          </>
        )}

        {/* A save guard's question (the office: a change that would take
            bookings away — the admin decides). */}
        {!readOnly &&
          guardPanels.map((panel, index) => (
            <div
              key={index}
              className="absolute inset-x-0 flex justify-center px-4"
              style={{ top: 84 }}
            >
              {panel}
            </div>
          ))}

        {/* Bottom-left: the map's controls (floors, fit, view, Map menu). The
            phone shell has its own. */}
        {!isEmpty && !(shellMode && isMobile) && (
          <div className="pointer-events-none absolute bottom-4 left-4">
            <MapControls isEditing={!readOnly} />
          </div>
        )}

        {/* The frame-rate readout (when on), top centre: clear of the panels
            down the sides. */}
        {!isEmpty && !flat && isFrameRateShown && stats && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2">
            <FrameRateReadout stats={stats} />
          </div>
        )}

        {/* Bottom bar: time of day + leave/enter editing. The app shell
            provides its own in display mode. */}
        {!shellMode && !isEmpty && (
          <TimeOfDay isViewing={readOnly}>{editable && modeButton}</TimeOfDay>
        )}

        {/* Viewing: the floors on the right edge, halfway down — like a lift's
            buttons, clear of the rail and the bars. Editing: top right under the
            toolbar — anchored, clear of the inspector growing up from the bottom
            (the catalogue has the left). */}
        {readOnly && !isEmpty && !(shellMode && isMobile) && (
          <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
            <FloorPicker />
          </div>
        )}
        {!readOnly && !isEmpty && (
          <div className="pointer-events-none absolute right-4 top-20">
            <FloorPicker isEditing />
          </div>
        )}

        {!readOnly && !isEmpty && (
          <>
            <TopBar
              dbMode={dbMode}
              saving={saving}
              saveFailed={saveFailed}
              onRetrySave={onRetrySave}
            />
            <Catalog />
          </>
        )}

        {/* Viewing without an app shell: the side panels' own rail (the app
            shell puts them in its rail). */}
        {readOnly && !shellMode && !isEmpty && <SidePanelRail />}

        {/* Bottom-right: the selection inspector (edit) above the controls
            guide. The app shell places the guide itself, in its side panel. */}
        {!isEmpty && !shellMode && (
          <div className="pointer-events-none absolute bottom-4 right-4 flex flex-col items-end gap-2">
            {!readOnly && <Inspector />}
            {guide}
          </div>
        )}

        {/* App chrome (floating panels) for the spatial display experience. */}
        {shellMode && displayShell?.({ enterEdit, empty: isEmpty, guide })}

        {/* Empty-office first run: offer templates or a blank start (admins),
            or explain why there's nothing here yet (everyone else). */}
        {isEmpty && EmptyState && (
          <EmptyState
            canEdit={canEdit}
            readOnly={readOnly}
            isEditable={editable}
            onEnterEdit={enterEdit}
            onDismiss={() => setEmptyDismissed(true)}
          />
        )}
      </div>
    </div>
  )
}
