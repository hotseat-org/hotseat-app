import { useCallback } from "react"
import { getFloorLink } from "./catalog"
import { getFloorId } from "./floors"
import { useEditorStoreApi } from "./store"
import type { SceneObject } from "./types"

/**
 * Viewing: what pressing stairs or a lift does — stairs take you to the floor
 * they lead to (up from their foot's floor, down from the opening on the
 * floor above), a lift opens its floor buttons. Undefined for any other piece.
 */
export const useFloorLinkClick = () => {
  const store = useEditorStoreApi()

  return useCallback(
    (piece: SceneObject) => {
      const link = getFloorLink(piece.type)
      if (!link) return false

      const { floors, currentFloor, showFloor, setLiftPanel } = store.getState()
      if (link === "all") {
        setLiftPanel(piece.id)

        return true
      }

      const stairsFloor = getFloorId(piece, floors)
      const level = floors.findIndex((floor) => floor.id === stairsFloor)
      // On their own floor: up; seen from the floor above (their opening): down.
      const destination = stairsFloor === currentFloor ? floors[level + 1] : floors[level]
      if (destination) showFloor(destination.id)

      return true
    },
    [store]
  )
}
