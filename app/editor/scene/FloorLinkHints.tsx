import { Html } from "@react-three/drei"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { getFloorLink } from "../catalog"
import { isFloorLink } from "../floorLinks"
import { getFloorNumber, getFloorTitle } from "../floors"
import { STOREY } from "../objects/dimensions"
import { useEditorStore } from "../store"
import type { SceneObject } from "../types"
import { getStairsDestination } from "../useFloorLinkClick"
import { useShownFloorLinks } from "../useShownFloorLinks"
import { useI18n } from "~/i18n/I18nProvider"

/** A way to another floor under the pointer, and where it's drawn (its opening, or the piece). */
interface HoveredLink {
  piece: SceneObject
  /** An opening of stairs from below (drawn flat on the floor), or a piece standing here. */
  isOpening: boolean
}

/**
 * Viewing: pointed at, stairs, their opening upstairs and lifts say what
 * pressing them does — "Up to Floor 2", "Down to Ground floor", "Lift:
 * choose a floor" — in a pill over them. They're pointed at like any piece
 * (usePieceHover: the hand, their outline); this only reads which one is.
 */
export const FloorLinkHints = () => {
  const i18n = useI18n()
  const { t } = i18n
  const objects = useEditorStore((state) => state.objects)
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const liftPanelId = useEditorStore((state) => state.liftPanelId)
  const { arrivingStairs, passingLifts } = useShownFloorLinks()
  const hoveredPieceId = useEditorStore((state) => state.hoveredPieceId)

  const links: HoveredLink[] = [
    ...objects.filter(isFloorLink).map((piece) => ({ piece, isOpening: false })),
    ...arrivingStairs.map((piece) => ({ piece, isOpening: true })),
    ...passingLifts.map((piece) => ({ piece, isOpening: false })),
  ]

  /** What pressing it does, in words, with its arrow. */
  const describe = ({ piece }: HoveredLink) => {
    if (getFloorLink(piece.type) === "all")
      return { icon: ArrowUpDown, text: t("Lift: choose a floor") }

    const destination = getStairsDestination({ floors, currentFloor, objects }, piece)
    if (!destination) return null

    const floor = floors.find((candidate) => candidate.id === destination)
    const name = floor?.name || getFloorTitle(i18n, getFloorNumber(floors, destination))
    const isUp = getFloorNumber(floors, destination) > getFloorNumber(floors, currentFloor)

    return isUp
      ? { icon: ArrowUp, text: t("Up to {floor}", { floor: name }) }
      : { icon: ArrowDown, text: t("Down to {floor}", { floor: name }) }
  }

  const hovered = links.find((link) => link.piece.id === hoveredPieceId) ?? null
  const hint = hovered && hovered.piece.id !== liftPanelId ? describe(hovered) : null
  const hintHeight = hovered?.isOpening ? 0.6 : STOREY + 0.35

  return (
    <>
      {hovered && hint && (
        <Html
          position={[hovered.piece.x, hintHeight, hovered.piece.z]}
          center
          zIndexRange={[15, 5]}
          style={{ pointerEvents: "none" }}
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-overlay px-2.5 py-1 text-xs font-extrabold text-foreground shadow-overlay">
            <hint.icon className="size-3.5 text-accent" />
            {hint.text}
          </span>
        </Html>
      )}
    </>
  )
}
