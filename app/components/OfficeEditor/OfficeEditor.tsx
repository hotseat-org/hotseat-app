import { Button } from "@heroui/react"
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useTheme } from "remix-themes"
import { Check, Gauge, Pencil, PencilRuler } from "lucide-react"
import {
  EditorStoreContextProvider,
  createEditorStore,
  useEditorStore,
  useEditorStoreApi,
  type EditorStore,
} from "./store"
import type { SceneObject } from "./types"
import { Catalog } from "./ui/Catalog"
import { Inspector } from "./ui/Inspector"
import { TopBar } from "./ui/TopBar"
import { TimeOfDay } from "./ui/TimeOfDay"
import { FloorPlan } from "./plan/FloorPlan"
import { hasWebGL } from "./webgl"
import { EmptyOffice } from "./ui/EmptyOffice"
import { TOOLS } from "./ui/tools"
import { PeopleContext, type People } from "./people"
import { isTypingTarget } from "./keyboard"
import { isEdgeType } from "./types"
import { ControlsGuide } from "./ui/ControlsGuide"
import { MOBILE_CHROME } from "~/components/office/mobile"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { OfficeFloor } from "~/components/office/OfficeFloor"
import { EmptyState } from "~/components/ui/EmptyState"
import { groupBookings, type BookingRow, type Day } from "~/utils/booking"

const NO_PEOPLE: People = { me: null, members: [] }
// three.js + the whole scene load only when the 3D view is shown.
const SceneCanvas = lazy(() => import("./scene/SceneCanvas"))

const KEY_TO_TOOL = new Map(TOOLS.map((t) => [t.key, t.tool]))

type Mode = "edit" | "display"

interface Props {
  /** When provided, the editor loads/saves this office's layout instead of localStorage. */
  initialObjects?: SceneObject[]
  /** Called (debounced) with the current scene whenever it changes. */
  onSave?: (objects: SceneObject[]) => void
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
  booking?: {
    today: Day
    /** The day to show first. */
    day: Day
    from: Day
    lastDay: Day
    reservations: BookingRow[]
    pending: boolean
    onReserve: (deskId: string, dates: Day[]) => void
    onCancel: (dates: Day[]) => void
  }
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

/**
 * Owns a fresh, isolated store for this editor instance so offices never share
 * scene data. DB-backed instances (with `onSave`) use no localStorage; the
 * standalone editor persists to a localStorage key.
 */
export const OfficeEditor = (props: Props) => {
  const storeRef = useRef<EditorStore>(undefined)
  if (!storeRef.current) {
    // DB-backed offices are born with their saved layout (no load race); the
    // standalone editor persists to localStorage instead.
    storeRef.current = props.onSave
      ? createEditorStore({ initialObjects: props.initialObjects })
      : createEditorStore({ persistKey: "office-editor:v1" })
  }

  return (
    <EditorStoreContextProvider value={storeRef.current}>
      <PeopleContext.Provider value={props.people ?? NO_PEOPLE}>
        <OfficeEditorInner {...props} />
      </PeopleContext.Provider>
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

  // Mirror the route's booking data into the store (the scene reads it there).
  // Bookings are replaced only when the loader brings new ones, so an
  // optimistic change survives until the server's answer arrives. The chosen
  // day is taken once; after that the day switcher owns it.
  const reservations = booking?.reservations
  // Layout effects: set before the first paint, so the bar and desk tags don't
  // pop in a frame late.
  useLayoutEffect(() => {
    if (reservations) store.getState().setBooking({ byDay: groupBookings(reservations) })
  }, [reservations, store])
  const { today, from, lastDay, pending, onReserve, onCancel } = booking ?? {}
  const firstDay = booking?.day
  useLayoutEffect(() => {
    if (!today || !from || !lastDay || !onReserve || !onCancel) return
    const current = store.getState().booking
    store.getState().setBooking({
      enabled: true,
      me: people?.me?.email ?? null,
      today,
      from,
      lastDay,
      day: current.enabled ? current.day : (firstDay ?? today),
      pending: !!pending,
      reserve: onReserve,
      cancel: onCancel,
    })
  }, [today, from, lastDay, pending, onReserve, onCancel, firstDay, people, store])
  // Keep the chosen day in the URL (?day=, dropped for today) so a reload or a
  // shared link shows the same day. Plain replaceState: no loader round-trip.
  const shownDay = useEditorStore((s) => (s.booking.enabled ? s.booking.day : null))
  useEffect(() => {
    if (!shownDay || !today) return
    const url = new URL(window.location.href)
    if (shownDay === today) url.searchParams.delete("day")
    else url.searchParams.set("day", shownDay)
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url)
  }, [shownDay, today])

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

  // Editing is 3D-only: without WebGL the office is view-only (as a 2D plan).
  // Phones are view-and-book only, always on the plan.
  const [webglOk] = useState(hasWebGL)
  const isMobile = useIsMobile()
  const editable = canEdit && webglOk && !isMobile
  const [mode, setMode] = useState<Mode>(editable ? initialMode : "display")
  useEffect(() => {
    if (isMobile) setMode("display")
  }, [isMobile])
  // "Edit layout" from the office settings (outside this tree) → edit mode.
  useEffect(() => {
    if (!editable) return
    const enterEdit = () => setMode("edit")
    window.addEventListener("hotseat:edit-layout", enterEdit)
    return () => window.removeEventListener("hotseat:edit-layout", enterEdit)
  }, [editable])
  const readOnly = mode === "display"
  // Display mode with an app shell: the shell owns the view toggle + time control.
  const shellMode = readOnly && !!displayShell
  // First-run helper for a brand-new (empty) office.
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  // Simple mode: the 2D floor plan instead of the 3D scene (view mode only).
  const view = useEditorStore((s) => s.view)
  const flat = readOnly && (view === "2d" || !webglOk || isMobile)
  // Mouse / trackpad controls: no use on a touch phone.
  const guide = isMobile ? null : (
    <ControlsGuide view={flat ? "plan" : readOnly ? "view" : "edit"} />
  )

  // Perf HUD. While on, the Canvas renders continuously (`frameloop="always"`)
  // so the reading reflects a true, comparable FPS instead of only the frames
  // that on-demand rendering happens to produce.
  const [showStats, setShowStats] = useState(false)
  const [stats, setStats] = useState({ fps: 0, ms: 0 })
  const onStats = useCallback((fps: number, ms: number) => setStats({ fps, ms }), [])
  const dbMode = !!onSave
  // What's already persisted, so autosave doesn't re-save the freshly-loaded scene.
  const lastSaved = useRef<string>(JSON.stringify(initialObjects ?? []))

  // Debounced autosave of the scene.
  const objects = useEditorStore((s) => s.objects)
  // A brand-new office (no layout, first-run card showing): no scene and no
  // editor/scene chrome — only the template card and the app essentials.
  const isEmpty = objects.length === 0 && !emptyDismissed
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  useEffect(() => {
    if (!onSave) return
    const serialized = JSON.stringify(objects)
    if (serialized === lastSaved.current) return
    const t = setTimeout(() => {
      lastSaved.current = serialized
      onSave(objects)
    }, 800)
    return () => clearTimeout(t)
  }, [objects, onSave])

  // A failed save means what's on screen isn't persisted: forget the "saved"
  // snapshot so leaving warns (and unmount flushes) until a save succeeds.
  useEffect(() => {
    if (saveFailed) lastSaved.current = ""
  }, [saveFailed])

  // Leaving within the debounce window (e.g. switching office) would drop the
  // last edit — flush it on unmount, and warn before closing the tab.
  useEffect(() => {
    const unsaved = () => JSON.stringify(store.getState().objects) !== lastSaved.current
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (onSaveRef.current && unsaved()) e.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      if (onSaveRef.current && unsaved()) onSaveRef.current(store.getState().objects)
    }
  }, [store])

  // Keyboard shortcuts (tool selection, rotate, delete, deselect) — edit only.
  useEffect(() => {
    if (readOnly) return
    const onKey = (e: KeyboardEvent) => {
      // Undo / redo: ⌘Z / ⇧⌘Z (Ctrl on Windows/Linux), plus ⌘Y.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !isTypingTarget(e.target)) {
        const k = e.key.toLowerCase()
        if (k === "z" || k === "y") {
          e.preventDefault()
          if (k === "y" || e.shiftKey) store.getState().redo()
          else store.getState().undo()
          return
        }
        // Clipboard + duplicate for the selection (furniture).
        if (k === "c") return store.getState().copySelection()
        if (k === "v") return store.getState().paste()
        if (k === "d") {
          e.preventDefault() // not the browser's bookmark shortcut
          return store.getState().duplicateSelection()
        }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      const s = store.getState()

      const mapped = KEY_TO_TOOL.get(e.key)
      if (mapped) {
        s.setTool(mapped)
        return
      }

      if (e.key === "m" || e.key === "M") {
        s.toggleMeasureHints()
        return
      }

      if (e.key === "r" || e.key === "R") {
        // Rotate the selected furniture (each piece in place); with nothing
        // turnable selected (or a wall/door), rotate the next placement.
        const sel = s.objects.find((o) => o.id === s.selectedId)
        if (sel && !isEdgeType(sel.type)) s.rotateSelection()
        else s.rotatePlacement()
        return
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (s.selection.length) {
          e.preventDefault()
          s.removeSelection()
        }
        return
      }

      if (e.key === "Escape") {
        s.select(null)
        s.setTool("select")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [readOnly, store])

  return (
    <div className="relative h-full w-full overflow-hidden">
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
            showStats={showStats}
            onStats={onStats}
          />
        </Suspense>
      )}

      {/* Empty office: cover the bare 3D scene with the same grid+dots backdrop
          as the empty-org screen (sits below the chrome + template card). */}
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 bg-background">
          <OfficeFloor />
        </div>
      )}

      {/* DOM overlay — panels re-enable pointer events individually. */}
      <div className="pointer-events-none absolute inset-0">
        <SelectionBox />

        {/* Perf HUD toggle + live FPS/frame-time readout (bottom-left). */}
        {!isEmpty && !flat && (
          <button
            type="button"
            onClick={() => setShowStats((v) => !v)}
            title={showStats ? "Hide FPS counter" : "Show FPS counter"}
            className={`pointer-events-auto absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2 font-mono text-sm shadow-overlay backdrop-blur-md ${
              showStats
                ? "bg-overlay/95 text-foreground"
                : "bg-overlay/90 text-muted hover:bg-surface-secondary hover:text-foreground"
            }`}
          >
            <Gauge className="size-4" />
            {showStats ? (
              <span className="tabular-nums">
                <span
                  className={
                    stats.fps >= 55
                      ? "text-success"
                      : stats.fps >= 30
                        ? "text-warning"
                        : "text-danger"
                  }
                >
                  {stats.fps.toFixed(0)}
                </span>{" "}
                FPS
                <span className="ml-2 text-muted">{stats.ms.toFixed(1)} ms</span>
              </span>
            ) : (
              <span>FPS</span>
            )}
          </button>
        )}

        {/* Bottom bar: time of day + leave/enter editing. The app shell
            provides its own in display mode. */}
        {!shellMode && !isEmpty && (
          <TimeOfDay viewSwitch={readOnly}>
            {!editable ? null : readOnly ? (
              <Button size="sm" variant="primary" onPress={() => setMode("edit")}>
                <Pencil className="size-4" /> Edit layout
              </Button>
            ) : (
              <Button size="sm" variant="primary" onPress={() => setMode("display")}>
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
        {shellMode && displayShell?.({ enterEdit: () => setMode("edit"), empty: isEmpty, guide })}

        {/* Empty-office first run: offer templates or a blank start (admins),
            or explain why there's nothing here yet (everyone else). */}
        {isEmpty && canEdit && (
          <EmptyOffice
            readOnly={readOnly}
            onEnterEdit={() => setMode("edit")}
            onDismiss={() => setEmptyDismissed(true)}
          />
        )}
        {isEmpty && !canEdit && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-6 shadow-overlay backdrop-blur-md">
              <EmptyState
                className="max-w-none"
                icon={PencilRuler}
                title="This office isn't set up yet"
                description="An admin needs to lay out the floor before desks can be booked."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OfficeEditor

/** The rubber-band rectangle of an in-progress box selection (client pixels). */
const SelectionBox = () => {
  const box = useEditorStore((s) => s.box)
  if (!box) return null
  const w = Math.abs(box.x1 - box.x0)
  const h = Math.abs(box.y1 - box.y0)
  if (w < 4 && h < 4) return null
  return (
    <div
      className="fixed rounded-sm border border-accent bg-accent/10"
      style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: w, height: h }}
    />
  )
}
