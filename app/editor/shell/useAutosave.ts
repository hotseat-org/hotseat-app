import { useEffect, useMemo, useRef } from "react"
import { readSavedLayout, type Layout } from "../floors"
import { useEditorStore, useEditorStoreApi } from "../store"
import { composeSavedLayout } from "../store/objects"
import type { AutosaveControls, SaveGuard, SaveOptions } from "../module"
import { useModules } from "../modules"

/** How long the layout must sit still before it's saved (ms). */
const SAVE_DELAY = 800

/**
 * Debounced autosave of the scene (DB-backed: with `onSave`). A module's save
 * guard can hold it (see EditorModule.useSaveGuard — the office's: a change
 * that would take bookings away waits for the admin's choice). Leaving within
 * the debounce window flushes the last edit; closing the tab with unsaved
 * changes warns. Returns what the guards show meanwhile.
 */
export const useAutosave = ({
  onSave,
  saveFailed,
}: {
  onSave: ((layout: Layout, options?: SaveOptions) => void) | undefined
  saveFailed: boolean | undefined
}) => {
  const store = useEditorStoreApi()
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const objects = useEditorStore((state) => state.objects)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const keptPieces = useEditorStore((state) => state.keptPieces)
  // What's saved: every floor, with the pieces kept aside (see ObjectsState).
  const layout = useMemo(
    () => composeSavedLayout({ floors, currentFloor, objects, otherFloorsPieces, keptPieces }),
    [floors, currentFloor, objects, otherFloorsPieces, keptPieces]
  )
  // What's already persisted, so autosave doesn't re-save the freshly loaded
  // layout — as the store composes it (one saved before floors reads the same).
  const lastSaved = useRef<string | null>(null)
  if (lastSaved.current === null)
    lastSaved.current = JSON.stringify(composeSavedLayout(store.getState()))

  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const getSavedLayout = () => readSavedLayout(JSON.parse(lastSaved.current || "[]"))

  const controls: AutosaveControls = {
    isEnabled: !!onSave,
    pieces: layout.pieces,
    getSavedPieces: () => getSavedLayout().pieces,
    saveNow: (options) => {
      lastSaved.current = JSON.stringify(layout)
      onSave?.(layout, options)
    },
    revert: () => store.getState().load(getSavedLayout()),
  }
  const modules = useModules()
  // Each module's hook, in a loop: safe, the list is fixed (see ModulesContext).
  const guards: SaveGuard[] = modules.flatMap((module) =>
    module.useSaveGuard ? [module.useSaveGuard(controls)] : []
  )
  const isHolding = guards.some((guard) => guard.isHolding)
  const isHoldingRef = useRef(isHolding)
  isHoldingRef.current = isHolding

  useEffect(() => {
    if (!onSave || isHolding) return // waiting on a guard (the admin's choice)

    const serialized = JSON.stringify(layout)
    if (serialized === lastSaved.current) return

    const timeoutId = setTimeout(() => {
      lastSaved.current = serialized
      onSave(layout)
    }, SAVE_DELAY)

    return () => clearTimeout(timeoutId)
  }, [layout, onSave, isHolding])

  // A failed save means what's on screen isn't persisted: forget the "saved"
  // snapshot so leaving warns (and unmount flushes) until a save succeeds.
  useEffect(() => {
    if (saveFailed) lastSaved.current = ""
  }, [saveFailed])

  // Leaving within the debounce window (e.g. switching office) would drop the
  // last edit — flush it on unmount, and warn before closing the tab.
  useEffect(() => {
    const unsaved = () => JSON.stringify(composeSavedLayout(store.getState())) !== lastSaved.current
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (onSaveRef.current && unsaved()) event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      // Not a change a guard holds (one that would take people's bookings
      // away): that waits for its choice, and leaving drops it rather than
      // decide for them.
      if (onSaveRef.current && unsaved() && !isHoldingRef.current)
        onSaveRef.current(composeSavedLayout(store.getState()))
    }
  }, [store])

  return { guardPanels: guards.flatMap((guard) => (guard.panel ? [guard.panel] : [])) }
}
