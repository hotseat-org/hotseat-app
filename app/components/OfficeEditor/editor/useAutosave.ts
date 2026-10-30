import { useEffect, useMemo, useRef, useState } from "react"
import { useEditorStore, useEditorStoreApi } from "../store"
import { isSeatable, type SceneObject } from "../types"
import { getLostBookings, planRehoming, type ReleasedBy } from "~/core/office/layoutImpact"

/** How long the layout must sit still before it's saved (ms). */
const SAVE_DELAY = 800

const bookingKey = (booking: { deskId: string; date: string; userEmail: string }) =>
  `${booking.deskId}|${booking.date}|${booking.userEmail}`

/**
 * Debounced autosave of the scene (DB-backed offices: with `onSave`). A change
 * that would take upcoming bookings away (desks removed or made permanent) is
 * held until the admin chooses (`resolveImpact`, see LayoutImpact). Leaving
 * within the debounce window flushes the last edit; closing the tab with
 * unsaved changes warns.
 */
export const useAutosave = ({
  initialObjects,
  onSave,
  saveFailed,
}: {
  initialObjects: SceneObject[] | undefined
  onSave: ((objects: SceneObject[], options?: { shouldRehome?: boolean }) => void) | undefined
  saveFailed: boolean | undefined
}) => {
  const store = useEditorStoreApi()
  const objects = useEditorStore((state) => state.objects)
  // What's already persisted, so autosave doesn't re-save the freshly-loaded scene.
  const lastSaved = useRef<string>(JSON.stringify(initialObjects ?? []))
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // What an unsaved change would do to upcoming bookings: who'd lose their
  // desk, and where they could move.
  const bookingState = useEditorStore((state) => state.booking)
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
    const after = objects.filter((piece) => isSeatable(piece.type))
    const lost = getLostBookings(after, bookings, releasedBy)
    if (lost.length === 0) return null
    const before = (JSON.parse(lastSaved.current || "[]") as SceneObject[]).filter((piece) =>
      isSeatable(piece.type)
    )
    return { before, moves: planRehoming({ before, after, bookings, lost, releasedBy }) }
  }, [objects, bookingState, onSave])
  // Bookings the admin has already decided about: hidden while that saves and
  // the bookings refresh (the panel comes back only for bookings not yet
  // decided — a further change that takes more).
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(() => new Set())
  const serializedObjects = useMemo(() => JSON.stringify(objects), [objects])
  const isImpactPending =
    !!impact && impact.moves.some((move) => !resolvedKeys.has(bookingKey(move.booking)))
  const impactRef = useRef(isImpactPending)
  impactRef.current = isImpactPending
  const resolveImpact = (choice: "move" | "cancel" | "undo") => {
    if (choice === "undo") {
      store.getState().load(JSON.parse(lastSaved.current || "[]"))
      return
    }
    setResolvedKeys(
      (keys) => new Set([...keys, ...(impact?.moves ?? []).map((move) => bookingKey(move.booking))])
    )
    lastSaved.current = serializedObjects
    onSave?.(objects, { shouldRehome: choice === "move" })
  }

  useEffect(() => {
    if (!onSave || isImpactPending) return // waiting on the admin's choice
    const serialized = JSON.stringify(objects)
    if (serialized === lastSaved.current) return
    const timeoutId = setTimeout(() => {
      lastSaved.current = serialized
      onSave(objects)
    }, SAVE_DELAY)
    return () => clearTimeout(timeoutId)
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
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (onSaveRef.current && unsaved()) event.preventDefault()
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

  return { impact: isImpactPending ? impact : null, resolveImpact }
}
