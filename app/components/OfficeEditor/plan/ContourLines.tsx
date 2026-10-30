import { useMemo, useRef } from "react"
import { tilesCovering, useLandscape } from "../contours"
import type { SurfacePalette } from "../palette"
import type { SceneObject } from "../types"
import { turnPoint, type View } from "./planView"

/** A rough tile, for grouping: the visible world bounds snap to this (m). */
const VISIBLE_STEP = 16

/** The plan is about the office: its land is drawn quieter than in 3D. */
const PLAN_CONTOUR_OPACITY = 0.5

/**
 * The endless contour map (see contours.ts), under the drawing: the plateau
 * the office stands on, then the lines of the tiles in view — turned with the
 * view, hairline at any zoom. Each tile's path is built once per turn.
 */
export const ContourLines = ({
  layout,
  turn,
  view,
  size,
  colors,
}: {
  layout: SceneObject[]
  turn: number
  view: View
  size: { w: number; h: number }
  colors: SurfacePalette["contour"]
}) => {
  const land = useLandscape(layout)
  const paths = useRef(new Map<string, { minor: string; major: string }>())
  // A new landscape or turn: the cached paths no longer apply.
  const cacheFor = useRef<unknown>(null)
  if (cacheFor.current !== land || paths.current.size > 600) {
    paths.current.clear()
    cacheFor.current = land
  }

  // The world rectangle in view: the screen corners, un-turned (snapped, so
  // panning a little doesn't re-render).
  const corners = [
    [0, 0],
    [size.w, 0],
    [0, size.h],
    [size.w, size.h],
  ].map(([px, py]) => turnPoint((px - view.tx) / view.k, (py - view.ty) / view.k, (4 - turn) % 4))
  const snap = (v: number, up: boolean) =>
    (up ? Math.ceil(v / VISIBLE_STEP) : Math.floor(v / VISIBLE_STEP)) * VISIBLE_STEP
  const x0 = snap(Math.min(...corners.map((c) => c[0])), false)
  const x1 = snap(Math.max(...corners.map((c) => c[0])), true)
  const z0 = snap(Math.min(...corners.map((c) => c[1])), false)
  const z1 = snap(Math.max(...corners.map((c) => c[1])), true)

  const tiles = useMemo(() => tilesCovering(x0, z0, x1, z1), [x0, z0, x1, z1])
  const toPath = (segments: Float32Array) => {
    let d = ""
    for (let i = 0; i < segments.length; i += 4) {
      const [ax, az] = turnPoint(segments[i], segments[i + 1], turn)
      const [bx, bz] = turnPoint(segments[i + 2], segments[i + 3], turn)
      d += `M${ax.toFixed(2)} ${az.toFixed(2)}L${bx.toFixed(2)} ${bz.toFixed(2)}`
    }
    return d
  }
  const pathsOf = (tx: number, tz: number) => {
    const key = `${tx},${tz},${turn}`
    let p = paths.current.get(key)
    if (!p) {
      const t = land.tile(tx, tz)
      p = { minor: toPath(t.minor), major: toPath(t.major) }
      paths.current.set(key, p)
    }
    return p
  }

  // The plateau hugs the building: its outline(s), turned with the view
  // (even-odd, so a courtyard left open stays a hole).
  const plateau = land.plateau
    .map(
      (loop) =>
        loop
          .map(([x, z], i) => {
            const [tx, tz] = turnPoint(x, z, turn)
            return `${i ? "L" : "M"}${tx.toFixed(2)} ${tz.toFixed(2)}`
          })
          .join("") + "Z"
    )
    .join("")
  return (
    <g aria-hidden>
      <path
        d={plateau}
        fillRule="evenodd"
        fill={colors.plateau}
        stroke={colors.major}
        strokeOpacity={PLAN_CONTOUR_OPACITY}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {tiles.map(([tx, tz]) => {
        const t = pathsOf(tx, tz)
        return (
          <g key={`${tx},${tz}`} opacity={PLAN_CONTOUR_OPACITY}>
            <path
              d={t.minor}
              stroke={colors.minor}
              strokeWidth={1.2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={t.major}
              stroke={colors.major}
              strokeWidth={2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )
      })}
    </g>
  )
}
