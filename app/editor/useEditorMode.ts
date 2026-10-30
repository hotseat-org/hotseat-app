import { useCallback, useEffect, useRef, useState } from "react"
import { useEditorStore, useEditorStoreApi } from "./store"
import { isTourDone } from "./ui/GuidedTour"
import { hasWebGL } from "./webgl"
import { useIsMobile } from "~/utils/hooks/useIsMobile"
import { useI18n } from "~/i18n/I18nProvider"

export type Mode = "edit" | "display"

/**
 * Editing or viewing, and how the office is shown. Editing is 3D-only:
 * without WebGL the office is view-only (as a 2D plan); phones are
 * view-and-book only, always on the plan. Also the 3D scene's busy moments,
 * shown instead of an unexplained freeze: while it first builds the office,
 * and while it switches to or from editing.
 */
export const useEditorMode = ({
  canEdit,
  initialMode,
}: {
  canEdit: boolean
  initialMode: Mode
}) => {
  const store = useEditorStoreApi()
  const { t } = useI18n()
  const [webglOk] = useState(hasWebGL)
  const isMobile = useIsMobile()
  const editable = canEdit && webglOk && !isMobile
  const [mode, setMode] = useState<Mode>(editable ? initialMode : "display")
  useEffect(() => {
    if (isMobile) setMode("display")
  }, [isMobile])
  const readOnly = mode === "display"

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
  // The one way into the editor: never on a phone or without WebGL, whatever
  // asks (the empty-office card, the shell, a settings button).
  const enterEdit = useCallback(() => {
    if (editable) switchMode("edit")
  }, [editable, switchMode])

  // Simple mode: the 2D floor plan instead of the 3D scene (view mode only).
  const view = useEditorStore((state) => state.view)
  const flat = readOnly && (view === "2d" || !webglOk || isMobile)
  // Leaving the 3D scene (for the plan) unmounts it: it builds afresh next time.
  useEffect(() => {
    if (flat) setReadyFor(null)
  }, [flat])

  const busyMode = pendingMode ?? (readyFor !== null && readyFor !== mode ? mode : null)
  const busyLabel =
    readyFor === null
      ? t("Building the office…")
      : busyMode === "edit"
        ? t("Opening the editor…")
        : busyMode === "display"
          ? t("Back to the office…")
          : null
  // Keep the last words while the indicator fades out.
  const lastBusyLabel = useRef(busyLabel)
  if (busyLabel) lastBusyLabel.current = busyLabel

  return {
    isMobile,
    editable,
    readOnly,
    flat,
    switchMode,
    enterEdit,
    handleSceneReady,
    /** The scene hasn't finished drawing yet (the first build). */
    isFirstLoad: readyFor === null,
    isBusy: !!busyLabel,
    /** What the busy indicator says (its last words while it fades out). */
    busyLabel: lastBusyLabel.current,
  }
}
