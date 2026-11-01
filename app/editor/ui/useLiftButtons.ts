import { getFloorNumber, getFloorTitle } from "../floors"
import { useAllPieces, useEditorStore } from "../store"
import type { LiftButton } from "./LiftButtons"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * The open lift panel's lift (see liftPanelId) and its floor buttons — every
 * floor, the top one first — with what pressing them does. Null while none
 * is open.
 */
export const useLiftPanel = () => {
  const i18n = useI18n()
  const { t } = i18n
  const liftPanelId = useEditorStore((state) => state.liftPanelId)
  const setLiftPanel = useEditorStore((state) => state.setLiftPanel)
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const showFloor = useEditorStore((state) => state.showFloor)
  const lift = useAllPieces().find((piece) => piece.id === liftPanelId)
  if (!lift) return null

  const buttons: LiftButton[] = [...floors].reverse().map((floor) => {
    const number = getFloorNumber(floors, floor.id)

    return {
      id: floor.id,
      number,
      name: floor.name || getFloorTitle(i18n, number),
      isShown: floor.id === currentFloor,
    }
  })

  return {
    lift,
    buttons,
    label: t("Lift: choose a floor"),
    closeLabel: t("Close"),
    onPick: showFloor,
    onClose: () => setLiftPanel(null),
  }
}
