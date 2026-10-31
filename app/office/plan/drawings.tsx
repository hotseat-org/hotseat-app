import { useMemo, type ReactNode } from "react"
import { heatColor } from "../heatmap/heatmap"
import { spotFor } from "../desks/seatSpot"
import { isSeatable } from "../catalog"
import { useDeskFilter, useDesksOnDay, type DeskOnDay } from "../booking/useBooking"
import { composeZoneAreas, type ZoneArea } from "../zones/zones"
import { drawZones } from "../zones/zoneDrawing"
import { GRID, type SceneObject } from "~/editor/core"
import { useEditorStore } from "~/editor"
import { turnObject } from "~/editor/kit"
import { footprintCells } from "~/editor/core"
import { type PlanDrawingContext, type PlanDrawings, type PlanPieceStyle } from "~/editor"
import { useI18n } from "~/i18n/I18nProvider"

/** A free desk's marker (the "+" ring), radius in plan units. */
const FREE_MARK = 0.2

/** Who sits at a desk: their chair's spot (plan units), for the HTML layer. */
export interface Occupant {
  id: string
  x: number
  z: number
  email: string
}

interface DeskInput {
  /** The shown day's desks, turned with the plan. */
  desks: DeskOnDay[]
  /** Free desks can be booked (booking on, not a past day, no heatmap). */
  bookable: boolean
  /** Does a desk pass the map's desk filter? */
  matches: (desk: SceneObject) => boolean
}

/**
 * How the office draws pieces on the plan: a desk by who's in (lived-in
 * when booked, clean when free and bookable), faded when the filter leaves it
 * out; everything else muted toward the floor, so desks stand out.
 */
export const composeOfficePieceStyles = ({ desks, bookable, matches }: DeskInput) => {
  const byId = new Map(desks.map((entry) => [entry.desk.id, entry]))

  return (object: SceneObject): PlanPieceStyle => {
    if (!isSeatable(object.type)) return { isMuted: true }

    const entry = byId.get(object.id)
    const isTaken = !!entry && entry.state.kind !== "free"

    return {
      isOccupied: bookable || isTaken ? isTaken : undefined,
      isDimmed: !matches(object),
    }
  }
}

interface DrawingInput extends DeskInput {
  /** The plan's turned layout. */
  objects: SceneObject[]
  /** Insights' heatmap: each desk's share of days in use (pads under them). */
  heat?: { ratios: Record<string, number>; isDark: boolean }
  /** A free desk's tooltip (translated). */
  freeTitle: string
  /** Team zones (the Zones layer), on the floor under the furniture. */
  zones?: { areas: ZoneArea[]; isDark: boolean; clipId: string }
  onPiece: (id: string) => void
}

/** The office's drawing on the plan: zones and heatmap pads on the floor, free desks' "+" over them. */
export const composeOfficePlanDrawings = ({
  objects,
  desks,
  bookable,
  matches,
  heat,
  freeTitle,
  zones,
  onPiece,
}: DrawingInput): PlanDrawings => {
  const byId = new Map(desks.map((entry) => [entry.desk.id, entry]))
  const seats = objects.filter((object) => object.type === "seat")
  const heatPads: ReactNode[] = []
  const markers: ReactNode[] = []
  for (const object of objects) {
    if (!isSeatable(object.type)) continue
    if (heat && object.id in heat.ratios) {
      const [footprintX, footprintZ] = footprintCells(object.type, object.rotation)
      const width = footprintX * GRID + 0.16
      const depth = footprintZ * GRID + 0.16
      heatPads.push(
        <rect
          key={`heat-${object.id}`}
          x={object.x - width / 2}
          y={object.z - depth / 2}
          width={width}
          height={depth}
          rx={0.25}
          fill={heatColor(heat.ratios[object.id], heat.isDark)}
          opacity={0.9}
        />
      )
    }

    const entry = byId.get(object.id)
    // Free to book (and not filtered out): the "+" ring on the seat.
    if (entry?.state.kind !== "free" || !bookable || !matches(object)) continue

    const spot = spotFor(object, seats)
    const radius = FREE_MARK
    markers.push(
      <g
        key={object.id}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation()
          onPiece(object.id)
        }}
      >
        <title>{freeTitle}</title>
        <circle
          cx={spot.x}
          cy={spot.z}
          r={radius}
          className="fill-overlay stroke-success"
          strokeWidth={0.045}
        />
        <path
          d={`M${spot.x - radius * 0.45} ${spot.z}h${radius * 0.9}M${spot.x} ${spot.z - radius * 0.45}v${radius * 0.9}`}
          className="stroke-success"
          strokeWidth={0.045}
          strokeLinecap="round"
        />
      </g>
    )
  }

  return {
    floor: (
      <>
        {zones && drawZones(zones)}
        {heatPads}
      </>
    ),
    top: markers,
  }
}

/** Who sits where on the shown day: their chair's spot. */
export const composeOccupants = (objects: SceneObject[], desks: DeskOnDay[]) => {
  const byId = new Map(desks.map((entry) => [entry.desk.id, entry]))
  const seats = objects.filter((object) => object.type === "seat")
  const occupants = new Map<string, Occupant>()
  for (const object of objects) {
    const entry = byId.get(object.id)
    if (!isSeatable(object.type) || !entry || entry.state.kind === "free") continue

    const spot = spotFor(object, seats)
    occupants.set(object.id, { id: object.id, x: spot.x, z: spot.z, email: entry.state.email })
  }

  return occupants
}

/** The shown day's desks, turned with the plan. */
export const usePlanDesks = () => {
  const { desks } = useDesksOnDay()
  const turn = useEditorStore((state) => state.planTurn)

  return useMemo(
    () => desks.map((entry) => ({ ...entry, desk: turnObject(entry.desk, turn) })),
    [desks, turn]
  )
}

/** Free desks can be booked: booking on, not a past day, no heatmap over them. */
export const usePlanBookable = () =>
  useEditorStore(
    (state) => state.booking.enabled && !(state.booking.day < state.booking.today) && !state.heatmap
  )

/** Each turned layout's zones, worked out once (the drawing and the names share them). */
const zoneAreasOf = new WeakMap<SceneObject[], ZoneArea[]>()
export const usePlanZoneAreas = (objects: SceneObject[]) => {
  const isShown = useEditorStore((state) => state.layers.zones)
  if (!isShown) return []

  let areas = zoneAreasOf.get(objects)
  if (!areas) zoneAreasOf.set(objects, (areas = composeZoneAreas(objects)))

  return areas
}

export const useOfficePieceStyles = () => {
  const desks = usePlanDesks()
  const bookable = usePlanBookable()
  const matches = useDeskFilter()

  return useMemo(
    () => composeOfficePieceStyles({ desks, bookable, matches }),
    [desks, bookable, matches]
  )
}

export const useOfficePlanDrawings = ({
  objects,
  isDark,
  idPrefix,
  onPiece,
}: PlanDrawingContext) => {
  const { t } = useI18n()
  const desks = usePlanDesks()
  const bookable = usePlanBookable()
  const matches = useDeskFilter()
  const heatmap = useEditorStore((state) => state.heatmap)
  const areas = usePlanZoneAreas(objects)
  const freeTitle = t("Free — tap to book")

  return useMemo(
    () =>
      composeOfficePlanDrawings({
        objects,
        desks,
        bookable,
        matches,
        heat: heatmap ? { ratios: heatmap.ratios, isDark } : undefined,
        freeTitle,
        zones: { areas, isDark, clipId: idPrefix },
        onPiece,
      }),
    [objects, desks, bookable, matches, heatmap, isDark, freeTitle, areas, idPrefix, onPiece]
  )
}
