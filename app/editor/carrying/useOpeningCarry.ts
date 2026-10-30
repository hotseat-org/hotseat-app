import { useCallback, useEffect, useRef, useState } from "react"
import { useEditorStoreApi } from "../store"
import type { SceneObject, Tool } from "../types"

/**
 * A door/window lifted out of its wall and carried to a new spot (see
 * OpeningCarry): lift → carry → drop is one undo step. Esc, a tool or mode
 * switch, or unmounting puts it back where it came from — it's never left
 * lifted out of the layout.
 */
export const useOpeningCarry = (readOnly: boolean, tool: Tool, dragId: string | null) => {
  const storeApi = useEditorStoreApi()
  const [carriedOpening, setCarriedOpening] = useState<SceneObject | null>(null)
  const carriedOpeningRef = useRef(carriedOpening)
  carriedOpeningRef.current = carriedOpening

  const pickOpening = (id: string) => {
    if (dragId || carriedOpening) return

    storeApi.getState().beginBatch() // lift → carry → drop = one undo step
    const opening = storeApi.getState().liftOpening(id)
    if (opening) setCarriedOpening(opening)
    else storeApi.getState().endBatch()
  }
  const restoreOpening = () => {
    const opening = carriedOpeningRef.current
    if (!opening) return

    storeApi.getState().placeOpening(opening, opening.x, opening.z)
    setCarriedOpening(null)
    storeApi.getState().endBatch()
  }
  /** The carried opening went in (OpeningCarry placed it). */
  const finishOpening = () => {
    setCarriedOpening(null)
    storeApi.getState().endBatch()
  }

  useEffect(() => restoreOpening, [])
  useEffect(() => {
    restoreOpening()
  }, [tool, readOnly])
  useEffect(() => {
    if (!carriedOpening) return

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && restoreOpening()
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [carriedOpening])

  // A stable handle for the (memoized) pieces.
  const latest = useRef(pickOpening)
  latest.current = pickOpening
  const onPickOpening = useCallback((id: string) => latest.current(id), [])

  return { carriedOpening, onPickOpening, finishOpening }
}
