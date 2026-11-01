import { useCallback } from "react"
import { getFloorLink } from "./catalog"
import { getFloorId } from "./floors"
import { useEditorStoreApi } from "./store"
import type { EditorState } from "./store"
import type { SceneObject } from "./types"

/**
 * Where pressing stairs takes you: the floor they lead to — up from their
 * own floor, down when seen from the floor above (their opening). Undefined
 * past the top or bottom.
 */
export const getStairsDestination = (
  { floors, currentFloor, objects }: Pick<EditorState, "floors" | "currentFloor" | "objects">,
  stairs: SceneObject
) => {
  // The shown floor's pieces carry no floor of their own (see splitLayout).
  const isOnShownFloor = objects.some((object) => object.id === stairs.id)
  const stairsFloor = isOnShownFloor ? currentFloor : getFloorId(stairs, floors)
  const level = floors.findIndex((floor) => floor.id === stairsFloor)

  return (stairsFloor === currentFloor ? floors[level + 1] : floors[level])?.id
}

/**
 * Viewing: what pressing stairs or a lift does — stairs take you to the floor
 * they lead to (see getStairsDestination), a lift opens its floor buttons.
 * False for any other piece.
 */
export const useFloorLinkClick = () => {
  const store = useEditorStoreApi()

  return useCallback(
    (piece: SceneObject) => {
      const link = getFloorLink(piece.type)
      if (!link) return false

      const state = store.getState()
      if (link === "all") {
        state.setLiftPanel(piece.id)

        return true
      }

      const destination = getStairsDestination(state, piece)
      if (destination) state.showFloor(destination)

      return true
    },
    [store]
  )
}
