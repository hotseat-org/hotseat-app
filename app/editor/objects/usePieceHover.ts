import { useContext, useEffect, useState } from "react"
import { CursorHintContext, type CursorHint } from "../shell/cursors"
import { useEditorStore, useEditorStoreApi } from "../store"

/** Right and middle mouse buttons (orbit and pan), as `buttons` bits. */
const CAMERA_BUTTONS = 2 | 4

/** Whether the camera is being dragged: any button viewing; orbit or pan editing (a left-drag is the tool's). */
const isCameraDrag = (buttons: number, isEditing: boolean) =>
  isEditing ? (buttons & CAMERA_BUTTONS) !== 0 : buttons !== 0

/**
 * The one way anything in the scene is pointed at — a piece, the opening of
 * stairs from below: hovered while the pointer is on it (not while the camera
 * is dragged over it), the scene's cursor showing what pressing does and —
 * viewing (`isShared`) — the store knowing, so its tag, its hint and its
 * outline follow, and so it can be pointed at from elsewhere (its tag, its
 * deskmate). Its outline shows while `isPointedAt`.
 * Wire `handleEnter` / `handleLeave` to the group's pointer enter and leave:
 * over and out also fire passing between its parts.
 */
export const usePieceHover = ({
  id,
  cursor,
  isShared,
  isEditing,
}: {
  id: string
  /** The cursor it shows, or none (not pointable now). */
  cursor: CursorHint | null
  isShared: boolean
  isEditing: boolean
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const setCursorHint = useContext(CursorHintContext)
  const storeApi = useEditorStoreApi()
  const isPointedElsewhere = useEditorStore(
    (state) => isShared && state.hoveredPieceId === id && !isHovered
  )
  useEffect(() => {
    if (!cursor || !isHovered) return

    setCursorHint(id, cursor)
    if (isShared) storeApi.getState().setHoveredPiece(id)

    return () => {
      setCursorHint(id, null)
      // Only its own: its tag may have taken over (the pointer went up onto it).
      if (isShared) storeApi.getState().clearHoveredPiece(id)
    }
  }, [cursor, isHovered, isShared, id, setCursorHint, storeApi])

  return {
    isHovered,
    isPointedAt: !!cursor && (isHovered || isPointedElsewhere),
    handleEnter: (event: { buttons: number }) => {
      if (isCameraDrag(event.buttons, isEditing)) return
      // Something carried: nothing else is pointable (an outline says it can
      // be pressed). Read here, not subscribed: every piece would draw again
      // at each pick-up and drop.
      if (storeApi.getState().carryingId !== null) return

      setIsHovered(true)
    },
    handleLeave: () => setIsHovered(false),
  }
}
