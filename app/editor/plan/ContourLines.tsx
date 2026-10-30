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
  size: { width: number; height: number }
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
    [size.width, 0],
    [0, size.height],
    [size.width, size.height],
  ].map(([viewX, viewY]) =>
    turnPoint(
      (viewX - view.offsetX) / view.zoom,
      (viewY - view.offsetY) / view.zoom,
      (4 - turn) % 4
    )
  )
  const snap = (value: number, shouldRoundUp: boolean) =>
    (shouldRoundUp ? Math.ceil(value / VISIBLE_STEP) : Math.floor(value / VISIBLE_STEP)) *
    VISIBLE_STEP
  const x0 = snap(Math.min(...corners.map((corner) => corner[0])), false)
  const x1 = snap(Math.max(...corners.map((corner) => corner[0])), true)
  const z0 = snap(Math.min(...corners.map((corner) => corner[1])), false)
  const z1 = snap(Math.max(...corners.map((corner) => corner[1])), true)

  const tiles = useMemo(() => tilesCovering(x0, z0, x1, z1), [x0, z0, x1, z1])
  const toPath = (segments: Float32Array) => {
    let path = ""
    for (let i = 0; i < segments.length; i += 4) {
      const [fromX, fromZ] = turnPoint(segments[i], segments[i + 1], turn)
      const [toX, toZ] = turnPoint(segments[i + 2], segments[i + 3], turn)
      path += `M${fromX.toFixed(2)} ${fromZ.toFixed(2)}L${toX.toFixed(2)} ${toZ.toFixed(2)}`
    }

    return path
  }
  const pathsOf = (tileX: number, tileZ: number) => {
    const key = `${tileX},${tileZ},${turn}`
    let tilePaths = paths.current.get(key)
    if (!tilePaths) {
      const tile = land.tile(tileX, tileZ)
      tilePaths = { minor: toPath(tile.minor), major: toPath(tile.major) }
      paths.current.set(key, tilePaths)
    }

    return tilePaths
  }

  // The plateau hugs the building: its outline(s), turned with the view
  // (even-odd, so a courtyard left open stays a hole).
  const plateau = land.plateau
    .map(
      (loop) =>
        `${loop
          .map(([x, z], i) => {
            const [turnedX, turnedZ] = turnPoint(x, z, turn)

            return `${i ? "L" : "M"}${turnedX.toFixed(2)} ${turnedZ.toFixed(2)}`
          })
          .join("")}Z`
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
      {tiles.map(([tileX, tileZ]) => {
        const tilePaths = pathsOf(tileX, tileZ)

        return (
          <g key={`${tileX},${tileZ}`} opacity={PLAN_CONTOUR_OPACITY}>
            <path
              d={tilePaths.minor}
              stroke={colors.minor}
              strokeWidth={1.2}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={tilePaths.major}
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
