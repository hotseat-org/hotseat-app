import { composeZoneOutline, type ZoneArea } from "../zones"
import { shade } from "~/editor/plan/shapes"

/** A zone's outline, inside its edge: this wide on screen (px), at any zoom. */
const ZONE_LINE_PX = 2

export interface ZonesInput {
  areas: ZoneArea[]
  isDark: boolean
  /** Unique per plan: the zones' clip paths are named after it. */
  clipId: string
}

/** Team zones (the Zones layer): a tint on their floor, and a line just inside their edge. */
export const drawZones = ({ areas, isDark, clipId }: ZonesInput) =>
  areas.map(({ zone, cells }, i) => {
    const path = composeZoneOutline(cells)
    const zoneClipId = `${clipId}-${i}`
    // The light floor washes a pale tint out: a deeper shade there.
    const color = isDark ? zone.color : shade(zone.color, 0.65)
    return (
      <g key={zone.name}>
        <clipPath id={zoneClipId}>
          <path d={path} />
        </clipPath>
        <path d={path} fill={color} fillOpacity={isDark ? 0.1 : 0.16} />
        {/* A line just inside its edge (clipped), so zones that meet keep apart. */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeOpacity={isDark ? 0.55 : 0.85}
          // Twice as wide, half of it clipped away outside the zone.
          strokeWidth={ZONE_LINE_PX * 2}
          vectorEffect="non-scaling-stroke"
          clipPath={`url(#${zoneClipId})`}
        />
      </g>
    )
  })
