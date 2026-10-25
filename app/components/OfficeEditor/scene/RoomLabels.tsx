import { Html } from "@react-three/drei"
import { useMemo } from "react"
import { SEG, enclosedRegions, type FloorCell } from "../layout"
import { useEditorStore } from "../store"
import { isSeatable } from "../types"
import { useI18n } from "~/i18n/I18nProvider"

/** Rooms smaller than this (m²) — a cupboard, a shaft — get no label. */
const MIN_AREA = 2

/** How much of a grid square is floor: all of it, or the triangles a diagonal leaves. */
const shareOf = (cell: FloorCell) => {
  if (cell.parts === undefined) return 1
  let n = 0
  for (let bits = cell.parts; bits; bits >>= 1) n += bits & 1
  return n / 4
}

/**
 * Editing (the Room sizes layer): each room's floor area and desk count, on
 * its floor — so resizing a room (drag a wall) shows what it gains or loses.
 */
export const RoomLabels = () => {
  // Bridged into the canvas; the text is made here, outside <Html>'s own root.
  const { tn, format } = useI18n()
  const objects = useEditorStore((s) => s.objects)
  const rooms = useMemo(() => {
    const desks = objects.filter((o) => isSeatable(o.type))
    return enclosedRegions(objects).flatMap((cells) => {
      const area = cells.reduce((sum, c) => sum + shareOf(c), 0) * SEG * SEG
      if (area < MIN_AREA) return []
      const inside = new Set(cells.map((c) => `${c.x},${c.z}`))
      const deskCount = desks.filter((d) =>
        inside.has(`${Math.floor(d.x / SEG) * SEG},${Math.floor(d.z / SEG) * SEG}`)
      ).length
      // On the room's own floor: the square nearest its middle (an L-shaped
      // room's middle can be outside it).
      const cx = cells.reduce((sum, c) => sum + c.x, 0) / cells.length + SEG / 2
      const cz = cells.reduce((sum, c) => sum + c.z, 0) / cells.length + SEG / 2
      const spot = cells.reduce((best, c) =>
        Math.hypot(c.x + SEG / 2 - cx, c.z + SEG / 2 - cz) <
        Math.hypot(best.x + SEG / 2 - cx, best.z + SEG / 2 - cz)
          ? c
          : best
      )
      return [{ x: spot.x + SEG / 2, z: spot.z + SEG / 2, area, deskCount }]
    })
  }, [objects])

  return (
    <>
      {rooms.map((room) => (
        <Html
          key={`${room.x},${room.z}`}
          position={[room.x, 0.05, room.z]}
          center
          zIndexRange={[5, 0]}
          style={{ pointerEvents: "none" }}
        >
          <span className="flex flex-col items-center whitespace-nowrap rounded-lg bg-overlay/80 px-2 py-0.5 text-center leading-tight text-foreground shadow-sm backdrop-blur-sm">
            <span className="text-xs font-bold tabular-nums">
              {format.number(Math.round(room.area * 10) / 10)} m²
            </span>
            {room.deskCount > 0 && (
              <span className="text-[10px] text-muted">
                {tn(room.deskCount, "{n} desk", "{n} desks")}
              </span>
            )}
          </span>
        </Html>
      ))}
    </>
  )
}
