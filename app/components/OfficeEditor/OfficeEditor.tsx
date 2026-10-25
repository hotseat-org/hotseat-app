import { Button } from "@heroui/react"
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useTheme } from "remix-themes"
import { Check, Pencil, PencilRuler } from "lucide-react"
import {
  EditorStoreContextProvider,
  createEditorStore,
  useEditorStore,
  useEditorStoreApi,
  type DeskPreferences,
  type EditorStore,
  type PreferenceChange,
} from "./store"
import type { SceneObject } from "./types"
import type { FrameStats } from "./scene/FpsMeter"
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
import { isEdgeType, isSeatable } from "./types"
import { ControlsGuide } from "./ui/ControlsGuide"
import { CustomBooking } from "./ui/CustomBooking"
import { RoutePill } from "./ui/RoutePill"
import { HeatmapPill } from "./ui/HeatmapPill"
import { SceneLoading } from "./ui/SceneLoading"
import { LayoutImpact } from "./ui/LayoutImpact"
import { CommandSearch } from "./ui/CommandSearch"
import { composeCommands } from "./ui/commands"
import { ContextMenu } from "./ui/ContextMenu"
import { GuidedTour, isTourDone } from "./ui/GuidedTour"
import { MapControls } from "./ui/MapControls"
import { KitLibraryContext, type KitLibrary } from "./kits"
import { MOBILE_CHROME } from "~/components/office/mobile"
import { getLostBookings, planRehoming, type ReleasedBy } from "~/core/office/layoutImpact"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { ContourBackdrop } from "~/components/ui/ContourBackdrop"
import { EmptyState } from "~/components/ui/EmptyState"
import { useI18n } from "~/i18n/I18nProvider"
import { groupBookings, type BookingRow, type Day, type DeskDays } from "~/utils/booking"

const NO_PEOPLE: People = { me: null, members: [] }
// three.js + the whole scene load only when the 3D view is shown.
const SceneCanvas = lazy(() => import("./scene/SceneCanvas"))

const KEY_TO_TOOL = new Map(TOOLS.map((t) => [t.key, t.tool]))

type Mode = "edit" | "display"

interface Props {
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
  booking?: {
    today: Day
    /** The day to show first. */
    day: Day
    from: Day
    lastDay: Day
    reservations: BookingRow[]
    /** Days permanent residents gave their desks up. */
    releases: BookingRow[]
    pending: boolean
    /** Book one or more desks (a custom booking can mix desks). */
    onReserve: (picks: DeskDays[]) => void
    onCancel: (dates: Day[]) => void
    onRelease: (deskId: string, dates: Day[]) => void
    onReclaim: (deskId: string, dates: Day[]) => void
    /** Your favourites, usual desk and waitlist days. */
    preferences: DeskPreferences
    onPreference: (change: PreferenceChange) => void
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
/** The office shell's floating panels (desktop): the left rail, the right column. */
const SHELL_INSETS = { left: 100, right: 340 }

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
        <KitLibraryContext.Provider value={props.kitLibrary ?? null}>
          <OfficeEditorInner {...props} />
        </KitLibraryContext.Provider>
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
  const releases = booking?.releases
  // Layout effects: set before the first paint, so the bar and desk tags don't
  // pop in a frame late.
  useLayoutEffect(() => {
    if (reservations) store.getState().setBooking({ byDay: groupBookings(reservations) })
  }, [reservations, store])
  useLayoutEffect(() => {
    if (releases) store.getState().setBooking({ released: groupBookings(releases) })
  }, [releases, store])
  const preferences = booking?.preferences
  const onPreference = booking?.onPreference
  useLayoutEffect(() => {
    if (preferences) store.getState().setBooking({ preferences })
  }, [preferences, store])
  useLayoutEffect(() => {
    if (onPreference) store.getState().setBooking({ setPreference: onPreference })
  }, [onPreference, store])
  const { today, from, lastDay, pending, onReserve, onCancel, onRelease, onReclaim } = booking ?? {}
  const firstDay = booking?.day
  useLayoutEffect(() => {
    if (!today || !from || !lastDay || !onReserve || !onCancel || !onRelease || !onReclaim) return
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
      release: onRelease,
      reclaim: onReclaim,
    })
  }, [
    today,
    from,
    lastDay,
    pending,
    onReserve,
    onCancel,
    onRelease,
    onReclaim,
    firstDay,
    people,
    store,
  ])
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
  const readOnly = mode === "display"

  // The 3D scene's busy moments, shown instead of an unexplained freeze: while
  // it first builds the office, and while it switches to or from editing.
  // `readyFor`: the mode the scene last finished drawing (null: not yet).
  const [readyFor, setReadyFor] = useState<Mode | null>(null)
  const [pendingMode, setPendingMode] = useState<Mode | null>(null)
  const handleSceneReady = useCallback((isReadOnly: boolean) => {
    setReadyFor(isReadOnly ? "display" : "edit")
    setPendingMode(null)
  }, [])
  /**
   * Switch mode with the busy indicator up first: the switch itself can freeze
   * the page for a moment, so it waits until the indicator has been painted
   * (two frames). Without the 3D scene there's nothing to wait for.
   */
  const switchMode = useCallback(
    (next: Mode) => {
      if (next === mode) return
      if (readyFor === null) return setMode(next)
      setPendingMode(next)
      requestAnimationFrame(() => requestAnimationFrame(() => setMode(next)))
    },
    [mode, readyFor]
  )
  const commands = useMemo(() => composeCommands(() => switchMode("display")), [switchMode])
  // Leaving editing closes its menus (and the tour); the first time in, the tour.
  useEffect(() => {
    if (readOnly)
      store.setState({ contextMenu: null, isCommandSearchOpen: false, isTourOpen: false })
    else if (!isTourDone()) store.setState({ isTourOpen: true })
  }, [readOnly, store])

  // "Edit layout" from the office settings (outside this tree) → edit mode.
  useEffect(() => {
    if (!editable) return
    const enterEdit = () => switchMode("edit")
    window.addEventListener("hotseat:edit-layout", enterEdit)
    return () => window.removeEventListener("hotseat:edit-layout", enterEdit)
  }, [editable, switchMode])

  // Wayfinding: a shared link (?to=<desk>) opens with the way to that desk
  // shown; the URL then follows whatever way is shown, so "Copy link" is just
  // the page's address. Editing puts it away.
  const routeDesk = useEditorStore((s) => s.route?.deskId)
  const hasLayout = useEditorStore((s) => s.objects.length > 0)
  const askedRoute = useRef(false)
  useEffect(() => {
    if (askedRoute.current || !hasLayout) return
    askedRoute.current = true
    const to = new URL(window.location.href).searchParams.get("to")
    if (to && store.getState().objects.some((o) => o.id === to)) store.getState().showRoute(to)
  }, [hasLayout, store])
  useEffect(() => {
    if (!askedRoute.current) return
    const url = new URL(window.location.href)
    if (routeDesk) url.searchParams.set("to", routeDesk)
    else url.searchParams.delete("to")
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url)
  }, [routeDesk])
  useEffect(() => {
    if (!readOnly) store.getState().clearRoute()
  }, [readOnly, store])
  // The one way into the editor: never on a phone or without WebGL, whatever
  // asks (the empty-office card, the shell, a settings button).
  const enterEdit = useCallback(() => {
    if (editable) switchMode("edit")
  }, [editable, switchMode])
  // Display mode with an app shell: the shell owns the view toggle + time control.
  const shellMode = readOnly && !!displayShell
  // First-run helper for a brand-new (empty) office.
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  // Simple mode: the 2D floor plan instead of the 3D scene (view mode only).
  const view = useEditorStore((s) => s.view)
  const flat = readOnly && (view === "2d" || !webglOk || isMobile)
  // Leaving the 3D scene (for the plan) unmounts it: it builds afresh next time.
  useEffect(() => {
    if (flat) setReadyFor(null)
  }, [flat])
  // Mouse / trackpad controls: no use on a touch phone.
  const guide = isMobile ? null : (
    <ControlsGuide view={flat ? "plan" : readOnly ? "view" : "edit"} />
  )

  // Perf HUD. While on, the Canvas renders continuously (`frameloop="always"`)
  // so the reading reflects a true, comparable FPS instead of only the frames
  // that on-demand rendering happens to produce.
  const isFrameRateShown = useEditorStore((s) => s.isFrameRateShown)
  const { t, tn } = useI18n()
  const busyMode = pendingMode ?? (readyFor !== null && readyFor !== mode ? mode : null)
  const currentBusyLabel =
    readyFor === null
      ? t("Building the office…")
      : busyMode === "edit"
        ? t("Opening the editor…")
        : busyMode === "display"
          ? t("Back to the office…")
          : null
  // Keep the last words while the indicator fades out.
  const lastBusyLabel = useRef(currentBusyLabel)
  if (currentBusyLabel) lastBusyLabel.current = currentBusyLabel
  const [stats, setStats] = useState<FrameStats | null>(null)
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

  // What an unsaved change would do to upcoming bookings (desks removed or
  // made permanent): nothing is saved until the admin chooses (LayoutImpact).
  const bookingState = useEditorStore((s) => s.booking)
  const impact = useMemo(() => {
    const booking = bookingState
    if (!onSave || !booking.enabled || !booking.today) return null
    const bookings = Object.entries(booking.byDay).flatMap(([date, desks]) =>
      date >= booking.today
        ? Object.entries(desks).map(([deskId, userEmail]) => ({ deskId, date, userEmail }))
        : []
    )
    if (bookings.length === 0) return null
    const releasedBy: ReleasedBy = new Map(
      Object.entries(booking.released).flatMap(([date, desks]) =>
        Object.entries(desks).map(([deskId, email]): [string, string] => [
          `${deskId}|${date}`,
          email,
        ])
      )
    )
    const after = objects.filter((o) => isSeatable(o.type))
    const lost = getLostBookings(after, bookings, releasedBy)
    if (lost.length === 0) return null
    const before = (JSON.parse(lastSaved.current || "[]") as SceneObject[]).filter((o) =>
      isSeatable(o.type)
    )
    return { before, moves: planRehoming({ before, after, bookings, lost, releasedBy }) }
  }, [objects, bookingState, onSave])
  // Bookings the admin has already decided about: hidden while that saves and
  // the bookings refresh (the panel comes back only for bookings not yet
  // decided — a further change that takes more).
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(() => new Set())
  const bookingKey = (b: { deskId: string; date: string; userEmail: string }) =>
    `${b.deskId}|${b.date}|${b.userEmail}`
  const serializedObjects = useMemo(() => JSON.stringify(objects), [objects])
  const isImpactPending =
    !!impact && impact.moves.some((m) => !resolvedKeys.has(bookingKey(m.booking)))
  const impactRef = useRef(isImpactPending)
  impactRef.current = isImpactPending
  const resolveImpact = (choice: "move" | "cancel" | "undo") => {
    if (choice === "undo") {
      store.getState().load(JSON.parse(lastSaved.current || "[]"))
      return
    }
    setResolvedKeys(
      (keys) => new Set([...keys, ...(impact?.moves ?? []).map((m) => bookingKey(m.booking))])
    )
    lastSaved.current = serializedObjects
    onSave?.(objects, { shouldRehome: choice === "move" })
  }

  useEffect(() => {
    if (!onSave || isImpactPending) return // waiting on the admin's choice
    const serialized = JSON.stringify(objects)
    if (serialized === lastSaved.current) return
    const t = setTimeout(() => {
      lastSaved.current = serialized
      onSave(objects)
    }, 800)
    return () => clearTimeout(t)
  }, [objects, onSave, isImpactPending])

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
      // Not a change that would take people's bookings away: that waits for
      // the admin's choice, and leaving drops it rather than decide for them.
      if (onSaveRef.current && unsaved() && !impactRef.current)
        onSaveRef.current(store.getState().objects)
    }
  }, [store])

  // Keyboard shortcuts (tool selection, rotate, delete, deselect) — edit only.
  useEffect(() => {
    if (readOnly) return
    const onKey = (e: KeyboardEvent) => {
      // Undo / redo: ⌘Z / ⇧⌘Z (Ctrl on Windows/Linux), plus ⌘Y.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !isTypingTarget(e.target)) {
        const k = e.key.toLowerCase()
        // The command search: ⌘K (Ctrl+K).
        if (k === "k") {
          e.preventDefault()
          return store.getState().setCommandSearchOpen(true)
        }
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
        <SceneLoading
          isVisible={!!currentBusyLabel}
          label={lastBusyLabel.current}
          isFirstLoad={readyFor === null}
        />
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
        {!readOnly && isImpactPending && impact && (
          <div className="absolute inset-x-0 flex justify-center px-4" style={{ top: 84 }}>
            <LayoutImpact
              moves={impact.moves}
              labelOf={(id) => impact.before.find((d) => d.id === id)?.label}
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

        {/* The map's controls (fit, view, Map menu), bottom-left — the phone
            shell has its own. Beside them, the frame-rate readout when on. */}
        {!isEmpty && !(shellMode && isMobile) && <MapControls isEditing={!readOnly} />}
        {!isEmpty && !flat && isFrameRateShown && stats && (
          <div className="pointer-events-none absolute bottom-4 left-[4.5rem] rounded-xl border border-border bg-overlay/95 px-3 py-2 font-mono text-sm text-foreground shadow-overlay backdrop-blur-md">
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
              {/* One per line: a narrow column stays clear of the centred bottom bar. */}
              <span className="block text-xs leading-5 text-muted">
                <span className="block">{t("CPU {ms} ms", { ms: stats.cpuMs.toFixed(1) })}</span>
                <span className="block">
                  {tn(stats.drawCalls, "{n} draw call", "{n} draw calls")}
                </span>
                <span className="block">{tn(stats.objects, "{n} object", "{n} objects")}</span>
              </span>
            </span>
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
        {isEmpty && !canEdit && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-overlay/90 p-6 shadow-overlay backdrop-blur-md">
              <EmptyState
                className="max-w-none"
                icon={PencilRuler}
                title={t("This office isn't set up yet")}
                description={t("An admin needs to lay out the floor before desks can be booked.")}
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
