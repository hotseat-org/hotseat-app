import { useEffect, useRef } from "react"
import { useEditorStore, useEditorStoreApi } from "./store"
import type { SceneObject } from "./types"
import type { AutosaveControls, SaveGuard, SaveOptions } from "./module"
import { useModules } from "./modules"

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
  initialObjects,
  onSave,
  saveFailed,
}: {
  initialObjects: SceneObject[] | undefined
  onSave: ((objects: SceneObject[], options?: SaveOptions) => void) | undefined
  saveFailed: boolean | undefined
}) => {
  const store = useEditorStoreApi()
  const objects = useEditorStore((state) => state.objects)
  // What's already persisted, so autosave doesn't re-save the freshly-loaded scene.
  const lastSaved = useRef<string>(JSON.stringify(initialObjects ?? []))
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const controls: AutosaveControls = {
    isEnabled: !!onSave,
    objects,
    getSavedObjects: () => JSON.parse(lastSaved.current || "[]") as SceneObject[],
    saveNow: (options) => {
      lastSaved.current = JSON.stringify(objects)
      onSave?.(objects, options)
    },
    revert: () => store.getState().load(JSON.parse(lastSaved.current || "[]")),
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

    const serialized = JSON.stringify(objects)
    if (serialized === lastSaved.current) return

    const timeoutId = setTimeout(() => {
      lastSaved.current = serialized
      onSave(objects)
    }, SAVE_DELAY)

    return () => clearTimeout(timeoutId)
  }, [objects, onSave, isHolding])

  // A failed save means what's on screen isn't persisted: forget the "saved"
  // snapshot so leaving warns (and unmount flushes) until a save succeeds.
  useEffect(() => {
    if (saveFailed) lastSaved.current = ""
  }, [saveFailed])

  // Leaving within the debounce window (e.g. switching office) would drop the
  // last edit — flush it on unmount, and warn before closing the tab.
  useEffect(() => {
    const unsaved = () => JSON.stringify(store.getState().objects) !== lastSaved.current
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
        onSaveRef.current(store.getState().objects)
    }
  }, [store])

  return { guardPanels: guards.flatMap((guard) => (guard.panel ? [guard.panel] : [])) }
}
