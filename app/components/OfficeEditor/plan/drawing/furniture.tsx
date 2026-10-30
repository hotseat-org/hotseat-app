import type { ReactNode } from "react"
import { heatColor } from "../../heatmap"
import { footprintCells } from "../../layout"
import { spotFor } from "../../seatSpot"
import { GRID, isEdgeType, isMarker, isSeatable, type SceneObject } from "../../types"
import type { DeskOnDay } from "../../useBooking"
import { drawPiece } from "../kits"
import { mix } from "../shapes"
import type { Push } from "./wallPieces"

/** A free desk's marker (the "+" ring), radius in plan units. */
const FREE_MARK = 0.2
/** How far furniture that can't be tapped fades toward the floor (0…1). */
const MUTED = 0.55

/** Who sits at a desk: their chair's spot (plan units), for the HTML layer. */
export interface Occupant {
  id: string
  x: number
  z: number
  email: string
}

export interface FurnitureInput {
  objects: SceneObject[]
  desks: DeskOnDay[]
  floorInside: string
  bookable: boolean
  /** Does a desk pass the map's desk filter? */
  matches: (desk: SceneObject) => boolean
  onDesk: (id: string) => void
  /** Insights' heatmap: each desk's share of days in use (pads under them). */
  heat?: { ratios: Record<string, number>; isDark: boolean }
  /** A free desk's tooltip (translated). */
  freeTitle: string
}

/**
 * Furniture, desks (tap to open) and whoever sits at them: the pieces go into
 * `push`; their shadows, the heatmap's pads and the free desks' markers come
 * back as layers of their own, and who sits where for the HTML layer.
 */
export const drawFurniture = (
  { objects, desks, floorInside, bookable, matches, onDesk, heat, freeTitle }: FurnitureInput,
  push: Push
) => {
  const byId = new Map(desks.map((d) => [d.desk.id, d]))
  const seats = objects.filter((o) => o.type === "seat")
  /** Furniture that can't be tapped, blended this far toward the floor. */
  const subdue = (color: string) => mix(color, floorInside, MUTED)
  /** Furniture's soft shadows: one layer over the floor and rugs, under the pieces. */
  const shadows: ReactNode[] = []
  /** Drawn over everything: which desks are free. */
  const markers: ReactNode[] = []
  /** The heatmap's pads, on the floor under the desks. */
  const heatPads: ReactNode[] = []
  const occupants = new Map<string, Occupant>()

  for (const o of objects) {
    if (isEdgeType(o.type) || isMarker(o.type)) continue
    const on = byId.get(o.id)
    const seatable = isSeatable(o.type)
    const taken = !!on && on.state.kind !== "free"
    // Filtered out (the map's desk filter): faded, and no "+" to book it.
    const isDimmed = seatable && !matches(o)
    if (seatable && heat && o.id in heat.ratios) {
      const [hx, hz] = footprintCells(o.type, o.rotation)
      const w = hx * GRID + 0.16
      const d = hz * GRID + 0.16
      heatPads.push(
        <rect
          key={`heat-${o.id}`}
          x={o.x - w / 2}
          y={o.z - d / 2}
          width={w}
          height={d}
          rx={0.25}
          fill={heatColor(heat.ratios[o.id], heat.isDark)}
          opacity={0.9}
        />
      )
    }
    // Can't be tapped: muted toward the floor, so desks stand out.
    const piece = seatable
      ? drawPiece(o, { occupied: bookable || taken ? taken : undefined })
      : drawPiece(o, {}, subdue)
    if (!piece) continue
    const open = (e: React.MouseEvent) => {
      e.stopPropagation()
      onDesk(o.id)
    }
    // The symbol is drawn in the piece's frame: move and turn it into place
    // (its +Z front turned by `rotation`, as in 3D). The shadow falls the same
    // way for every piece: down and to the right.
    const turn = (-o.rotation * 180) / Math.PI
    const [cx, cz] = footprintCells(o.type, o.rotation)
    push(
      {
        x0: o.x - (cx * GRID) / 2,
        x1: o.x + (cx * GRID) / 2,
        z0: o.z - (cz * GRID) / 2,
        z1: o.z + (cz * GRID) / 2,
        y0: 0,
        y1: piece.height,
      },
      <g
        transform={`translate(${o.x} ${o.z}) rotate(${turn})`}
        className={seatable ? "cursor-pointer" : undefined}
        onClick={seatable ? open : undefined}
        opacity={isDimmed ? 0.3 : undefined}
      >
        {piece.node}
      </g>
    )
    if (piece.height > 0.05)
      shadows.push(
        <g key={o.id} transform={`translate(${o.x + 0.04} ${o.z + 0.07}) rotate(${turn})`}>
          {piece.silhouette}
        </g>
      )
    if (!seatable || !on) continue
    const spot = spotFor(o, seats)
    if (on.state.kind === "free") {
      if (!bookable || isDimmed) continue
      // Free to book: the "+" ring on the seat.
      const r = FREE_MARK
      markers.push(
        <g key={o.id} className="cursor-pointer" onClick={open}>
          <title>{freeTitle}</title>
          <circle
            cx={spot.x}
            cy={spot.z}
            r={r}
            className="fill-overlay stroke-success"
            strokeWidth={0.045}
          />
          <path
            d={`M${spot.x - r * 0.45} ${spot.z}h${r * 0.9}M${spot.x} ${spot.z - r * 0.45}v${r * 0.9}`}
            className="stroke-success"
            strokeWidth={0.045}
            strokeLinecap="round"
          />
        </g>
      )
      continue
    }
    // Taken: who sits there — drawn over the plan in HTML (see Occupant).
    occupants.set(o.id, { id: o.id, x: spot.x, z: spot.z, email: on.state.email })
  }
  return { shadows, markers, heatPads, occupants }
}
