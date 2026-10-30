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
import type { SceneObject } from "./types"
import type { FrameStats } from "./scene/FpsMeter"
import { Catalog } from "./ui/Catalog"
import { Inspector } from "./ui/Inspector"
import { TopBar } from "./ui/TopBar"
import { TimeOfDay } from "./ui/TimeOfDay"
import { FloorPlan } from "./plan/FloorPlan"
import { EmptyOffice } from "./ui/EmptyOffice"
import { PeopleContext, type People } from "./people"
import { ControlsGuide } from "./ui/ControlsGuide"
import { CustomBooking } from "./ui/CustomBooking"
import { RoutePill } from "./ui/RoutePill"
import { HeatmapPill } from "./ui/HeatmapPill"
import { SceneLoading } from "./ui/SceneLoading"
import { LayoutImpact } from "./ui/LayoutImpact"
import { CommandSearch } from "./ui/CommandSearch"
import { composeCommands } from "./ui/commands"
import { ContextMenu } from "./ui/ContextMenu"
import { GuidedTour } from "./ui/GuidedTour"
import { MapControls } from "./ui/MapControls"
import { KitLibraryContext, type KitLibrary } from "./kits"
import { FrameRateReadout } from "./editor/FrameRateReadout"
import { OfficeNotSetUp } from "./editor/OfficeNotSetUp"
import { SelectionBox } from "./editor/SelectionBox"
import { useAutosave } from "./editor/useAutosave"
import { useBookingSync, type EditorBooking } from "./editor/useBookingSync"
import { useEditorMode, type Mode } from "./editor/useEditorMode"
import { useEditorShortcuts } from "./editor/useEditorShortcuts"
import { useRouteLink } from "./editor/useRouteLink"
import type { EditorModule } from "./editor/module"
import { officeModule } from "./office/module"
import { ModulesContext } from "./editor/modules"
import { MOBILE_CHROME } from "~/components/office/mobile"
import { ContourBackdrop } from "~/components/ui/ContourBackdrop"

const NO_PEOPLE: People = { me: null, members: [] }
// three.js + the whole scene load only when the 3D view is shown.
const SceneCanvas = lazy(() => import("./scene/SceneCanvas"))

interface Props {
  /** The modules this editor runs with; the office's by default. */
  modules?: EditorModule[]
  /** When provided, the editor loads/saves this office's layout instead of localStorage. */
  initialObjects?: SceneObject[]
  /**
   * Called (debounced) with the current scene whenever it changes. With
   * `shouldRehome`, bookings the change takes away move to free desks.
   */
  onSave?: (objects: SceneObject[], options?: { shouldRehome?: boolean }) => void
  /** The organization's saved rooms (a real office); without it, this browser's. */
  kitLibrary?: KitLibrary
  /** Whether a save is currently in flight (for the indicator). */
  saving?: boolean
  /** The last save failed (shown in the top bar; the route retries). */
  saveFailed?: boolean
  /** Resubmit the latest layout now. */
  onRetrySave?: () => void
  /** Org members (desk assignment + name tags). Omit standalone. */
  people?: People
  /** Which mode to open in. */
  initialMode?: Mode
  /** May this person edit the layout? (Admins only in a real office.) Default true. */
  canEdit?: boolean
  /** Desk booking data + actions for a real office. Omit standalone. */
  booking?: EditorBooking
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
}

/** The office shell's floating panels (desktop): the left rail, the right column. */
const SHELL_INSETS = { left: 100, right: 340 }

/**
 * Owns a fresh, isolated store for this editor instance so offices never share
 * scene data. DB-backed instances (with `onSave`) use no localStorage; the
 * standalone editor persists to a localStorage key.
 */
export const OfficeEditor = (props: Props) => {
  // One module list for the editor's life (their hooks are called in order).
  const [modules] = useState(() => props.modules ?? [officeModule])
  const storeRef = useRef<EditorStore>(undefined)
  if (!storeRef.current) {
    // DB-backed offices are born with their saved layout (no load race); the
    // standalone editor persists to localStorage instead.
    storeRef.current = props.onSave
      ? createEditorStore({ initialObjects: props.initialObjects, modules })
      : createEditorStore({ persistKey: "office-editor:v1", modules })
  }

  return (
    <EditorStoreContextProvider value={storeRef.current}>
      <ModulesContext.Provider value={modules}>
        <PeopleContext.Provider value={props.people ?? NO_PEOPLE}>
          <KitLibraryContext.Provider value={props.kitLibrary ?? null}>
            <OfficeEditorInner {...props} />
          </KitLibraryContext.Provider>
        </PeopleContext.Provider>
      </ModulesContext.Provider>
    </EditorStoreContextProvider>
  )
}

const OfficeEditorInner = ({
  initialObjects,
  onSave,
  saving,
  saveFailed,
  onRetrySave,
  people,
  initialMode = "edit",
  canEdit = true,
  booking,
  displayShell,
}: Props) => {
  const store = useEditorStoreApi()
  useBookingSync(booking, people)

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
  const commands = useMemo(() => composeCommands(() => switchMode("display")), [switchMode])
  useRouteLink(readOnly)
  useEditorShortcuts(readOnly)
  const { impact, resolveImpact } = useAutosave({ initialObjects, onSave, saveFailed })

  // Display mode with an app shell: the shell owns the view toggle + time control.
  const shellMode = readOnly && !!displayShell
  // First-run helper for a brand-new (empty) office.
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  // A brand-new office (no layout, first-run card showing): no scene and no
  // editor/scene chrome — only the template card and the app essentials.
  const hasLayout = useEditorStore((state) => state.objects.length > 0)
  const isEmpty = !hasLayout && !emptyDismissed
  // Mouse / trackpad controls: no use on a touch phone.
  const guide = isMobile ? null : (
    <ControlsGuide view={flat ? "plan" : readOnly ? "view" : "edit"} />
  )

  // Perf HUD. While on, the Canvas renders continuously (`frameloop="always"`)
  // so the reading reflects a true, comparable FPS instead of only the frames
  // that on-demand rendering happens to produce.
  const isFrameRateShown = useEditorStore((state) => state.isFrameRateShown)
  const [stats, setStats] = useState<FrameStats | null>(null)
  const dbMode = !!onSave

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The scene's own layer: its floating labels and desk card stack inside
          it (isolate), so they never cover the panels and menus above. */}
      <div className="absolute inset-0 isolate">
        {!isEmpty && flat && (
          <FloorPlan
            dark={isDark}
            padRight={shellMode ? 340 : 40}
            phoneChrome={shellMode && isMobile ? MOBILE_CHROME : undefined}
          />
        )}
        {!isEmpty && !flat && (
          <Suspense fallback={null}>
            <SceneCanvas
              store={store}
              people={people ?? NO_PEOPLE}
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
        {/* Booking a desk on any days (the seat card's "Custom…"). */}
        {readOnly && <CustomBooking />}

        {/* Right-click menu and the command search (⌘K). */}
        {!readOnly && (
          <>
            <ContextMenu />
            <CommandSearch commands={commands} />
            {!isEmpty && <GuidedTour />}
          </>
        )}

        {/* An unsaved change that would take bookings away: the admin decides. */}
        {!readOnly && impact && (
          <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: 84 }}>
            <LayoutImpact
              moves={impact.moves}
              labelOf={(id) => impact.before.find((entry) => entry.id === id)?.label}
              onMove={() => resolveImpact("move")}
              onCancel={() => resolveImpact("cancel")}
              onUndo={() => resolveImpact("undo")}
            />
          </div>
        )}

        {/* The way to a desk (where to, how far, share, close) and the
            Insights heatmap's legend. */}
        {readOnly && (
          <div
            className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
            style={{ top: isMobile ? MOBILE_CHROME.top + 12 : 84 }}
          >
            <RoutePill className="max-w-full" />
            <HeatmapPill isDark={isDark} className="max-w-full" />
          </div>
        )}

        {/* Bottom-left, one column: the frame-rate readout (when on) above the
            map's controls (fit, view, Map menu) — so the controls, widening on
            hover, never cover it. The phone shell has its own controls. */}
        {!isEmpty && (
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-2">
            {!flat && isFrameRateShown && stats && <FrameRateReadout stats={stats} />}
            {!(shellMode && isMobile) && <MapControls isEditing={!readOnly} />}
          </div>
        )}

        {/* Bottom bar: time of day + leave/enter editing. The app shell
            provides its own in display mode. */}
        {!shellMode && !isEmpty && (
          <TimeOfDay isViewing={readOnly}>
            {!editable ? null : readOnly ? (
              <Button size="sm" variant="primary" className="min-w-32" onPress={enterEdit}>
                <Pencil className="size-4" /> Edit layout
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                className="min-w-32"
                onPress={() => switchMode("display")}
              >
                <Check className="size-4" strokeWidth={2.5} /> Done
              </Button>
            )}
          </TimeOfDay>
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
        {isEmpty && canEdit && (
          <EmptyOffice
            readOnly={readOnly}
            isEditable={editable}
            onEnterEdit={enterEdit}
            onDismiss={() => setEmptyDismissed(true)}
          />
        )}
        {isEmpty && !canEdit && <OfficeNotSetUp />}
      </div>
    </div>
  )
}

export default OfficeEditor
