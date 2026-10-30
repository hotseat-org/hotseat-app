import { Html } from "@react-three/drei"
import { useMemo } from "react"
import { SEG, enclosedRegions, getCellKey, getCellKeyAt, type FloorCell } from "../layout"
import { useEditorStore } from "../store"
import { describePieces, useModules } from "../modules"
import { useI18n } from "~/i18n/I18nProvider"

/** Rooms smaller than this (m²) — a cupboard, a shaft — get no label. */
const MIN_AREA = 2

/** How much of a grid square is floor: all of it, or the triangles a diagonal leaves. */
const shareOf = (cell: FloorCell) => {
  if (cell.parts === undefined) return 1

  let count = 0
  for (let bits = cell.parts; bits; bits >>= 1) count += bits & 1

  return count / 4
}

/**
 * Editing (the Room sizes layer): each room's floor area and desk count, on
 * its floor — so resizing a room (drag a wall) shows what it gains or loses.
 */
export const RoomLabels = () => {
  // Bridged into the canvas; the text is made here, outside <Html>'s own root.
  const i18n = useI18n()
  const { format } = i18n
  const modules = useModules()
  const objects = useEditorStore((state) => state.objects)
  const rooms = useMemo(
    () =>
      enclosedRegions(objects).flatMap((cells) => {
        const area = cells.reduce((sum, cell) => sum + shareOf(cell), 0) * SEG * SEG
        if (area < MIN_AREA) return []

        const inside = new Set(cells.map((cell) => getCellKey(cell.x, cell.z)))
        const pieces = objects.filter((object) => inside.has(getCellKeyAt(object.x, object.z)))
        // What the modules say about it (the office: its desks).
        const description = describePieces(modules, pieces, i18n)
        // On the room's own floor: the square nearest its middle (an L-shaped
        // room's middle can be outside it).
        const centreX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length + SEG / 2
        const centreZ = cells.reduce((sum, cell) => sum + cell.z, 0) / cells.length + SEG / 2
        const spot = cells.reduce((best, cell) =>
          Math.hypot(cell.x + SEG / 2 - centreX, cell.z + SEG / 2 - centreZ) <
          Math.hypot(best.x + SEG / 2 - centreX, best.z + SEG / 2 - centreZ)
            ? cell
            : best
        )

        return [{ x: spot.x + SEG / 2, z: spot.z + SEG / 2, area, description }]
      }),
    [objects, modules, i18n]
  )

  return (
    <>
      {rooms.map((room) => (
        <Html
          key={getCellKey(room.x, room.z)}
          position={[room.x, 0.05, room.z]}
          center
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="flex flex-col items-center whitespace-nowrap rounded-lg bg-overlay/80 px-2 py-0.5 text-center leading-tight text-foreground shadow-sm backdrop-blur-sm">
            <span className="text-xs font-bold tabular-nums">
              {format.number(Math.round(room.area * 10) / 10)} m²
            </span>
            {room.description && <span className="text-[10px] text-muted">{room.description}</span>}
          </span>
        </Html>
      ))}
    </>
  )
}
