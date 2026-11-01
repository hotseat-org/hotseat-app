import { Html } from "@react-three/drei"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useContext, useState } from "react"
import { getFloorLink, getItem } from "../catalog"
import { isFloorLink } from "../floorLinks"
import { getFloorNumber, getFloorTitle } from "../floors"
import { STOREY } from "../objects/dimensions"
import { FootprintPlinth } from "../objects/FootprintPlinth"
import { CursorHintContext } from "../shell/cursors"
import { useEditorStore } from "../store"
import { GRID, type SceneObject } from "../types"
import { getStairsDestination } from "../useFloorLinkClick"
import { useShownFloorLinks } from "../useShownFloorLinks"
import { useI18n } from "~/i18n/I18nProvider"

/**
 * How far an outline stands proud of its piece (m) — it's always met first
 * by the pointer. Flush with the piece's faces (a lift's shaft), the two
 * took turns being nearest as the pointer moved: the hint flickered.
 */
const OUTLINE_MARGIN = 0.08

/** A way to another floor under the pointer, and where it's drawn (its opening, or the piece). */
interface HoveredLink {
  piece: SceneObject
  /** An opening of stairs from below (drawn flat on the floor), or a piece standing here. */
  isOpening: boolean
}

/**
 * Viewing: pointed at, stairs, their opening upstairs and lifts say what
 * pressing them does — "Up to Floor 2", "Down to Ground floor", "Lift:
 * choose a floor" — in a pill over them, and the pointer turns to a hand.
 * Their outlines only catch the pointer: clicks go on to the pieces.
 */
export const FloorLinkHints = () => {
  const i18n = useI18n()
  const { t } = i18n
  const objects = useEditorStore((state) => state.objects)
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const liftPanelId = useEditorStore((state) => state.liftPanelId)
  const { arrivingStairs, passingLifts } = useShownFloorLinks()
  const [hovered, setHovered] = useState<HoveredLink | null>(null)
  // The scene's own cursor (the hand), as pieces set it — the page's is under the canvas's.
  const setCursorHint = useContext(CursorHintContext)

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

  const hint = hovered && hovered.piece.id !== liftPanelId ? describe(hovered) : null
  const hintHeight = hovered?.isOpening ? 0.6 : STOREY + 0.35

  return (
    <>
      {links.map((link) => {
        const [cellsX, cellsZ] = getItem(link.piece.type).footprint
        const height = (link.isOpening ? 0.05 : STOREY) + OUTLINE_MARGIN

        return (
          <mesh
            key={`${link.piece.id}:${link.isOpening}`}
            visible={false}
            position={[link.piece.x, height / 2, link.piece.z]}
            rotation-y={link.piece.rotation}
            onPointerOver={() => {
              setHovered(link)
              setCursorHint(`link:${link.piece.id}`, "point")
            }}
            onPointerOut={() => {
              setHovered((current) => (current?.piece.id === link.piece.id ? null : current))
              setCursorHint(`link:${link.piece.id}`, null)
            }}
          >
            <boxGeometry
              args={[
                cellsX * GRID + 2 * OUTLINE_MARGIN,
                height,
                cellsZ * GRID + 2 * OUTLINE_MARGIN,
              ]}
            />
          </mesh>
        )
      })}
      {/* An opening pointed at: outlined like a piece (the pieces outline themselves). */}
      {arrivingStairs.map((stairs) => {
        const [cellsX, cellsZ] = getItem(stairs.type).footprint

        return (
          <group key={stairs.id} position={[stairs.x, 0, stairs.z]} rotation-y={stairs.rotation}>
            <FootprintPlinth
              width={cellsX * GRID}
              depth={cellsZ * GRID}
              hovered={hovered?.isOpening === true && hovered.piece.id === stairs.id}
            />
          </group>
        )
      })}
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
