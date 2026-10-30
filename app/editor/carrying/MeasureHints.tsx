import { useLayoutEffect, useMemo } from "react"
import { Html } from "@react-three/drei"
import { DataTexture, NearestFilter, RepeatWrapping, RGBAFormat } from "three"
import { edgeLength, footprintCells, isDiagonalEdge, runsAlongX } from "../layout"
import {
  GRID,
  isEdgeType,
  isMarker,
  isOverhead,
  isWallMounted,
  type ObjectType,
  type SceneObject,
} from "../types"
import { getItem } from "../catalog"

/** Distances further than this aren't worth a label. */
const MAX = 4
/** Alignment guides look this far for a partner. */
const GUIDE_REACH = 8
const HEIGHT = 0.035
const MEASURE = "#3b82f6"
const GUIDE = "#3fd0ff"
const EPSILON = 1e-6
/** Line width (world units) and dash rhythm. */
const WIDTH = 0.03
const DASH = 0.14

type P3 = [number, number, number]

/** A 2-texel white/clear strip: repeated along a line it draws dashes. */
const dashTexture = () => {
  const texture = new DataTexture(
    new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]),
    2,
    1,
    RGBAFormat
  )
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.wrapS = RepeatWrapping
  texture.needsUpdate = true

  return texture
}

/**
 * A flat line on the floor from `from` to `to`, drawn as a thin ribbon with a
 * plain material (dashed via a repeating alpha texture). It stays mounted and
 * just hides when unused, and nothing about its material ever changes — so
 * its shader compiles once, not on every step (drei's Line rebuilt its
 * material whenever the points moved: hundreds of recompiles per carry).
 */
const Ribbon = ({
  segment,
  color,
  dashed,
}: {
  segment: { from: P3; to: P3 } | null
  color: string
  dashed?: boolean
}) => {
  const texture = useMemo(() => (dashed ? dashTexture() : null), [dashed])
  const deltaX = segment ? segment.to[0] - segment.from[0] : 0
  const deltaZ = segment ? segment.to[2] - segment.from[2] : 0
  const length = Math.hypot(deltaX, deltaZ)
  useLayoutEffect(() => {
    if (texture) texture.repeat.set(Math.max(1, length / DASH), 1)
  }, [texture, length])
  useLayoutEffect(() => () => texture?.dispose(), [texture])

  return (
    <group
      visible={!!segment && length > 0}
      position={
        segment
          ? [(segment.from[0] + segment.to[0]) / 2, HEIGHT, (segment.from[2] + segment.to[2]) / 2]
          : [0, -1, 0]
      }
      rotation={[0, -Math.atan2(deltaZ, deltaX), 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[length || 0.001, WIDTH, 1]} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial
          color={color}
          alphaMap={texture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

const rectOf = ({
  type,
  rotation,
  x,
  z,
}: {
  type: ObjectType
  rotation: number
  x: number
  z: number
}): Rect => {
  const [cellsX, cellsZ] = footprintCells(type, rotation)
  const halfX = (cellsX * GRID) / 2
  const halfZ = (cellsZ * GRID) / 2

  return { x0: x - halfX, x1: x + halfX, z0: z - halfZ, z1: z + halfZ }
}

const centreOf = (rect: Rect) => ({ x: (rect.x0 + rect.x1) / 2, z: (rect.z0 + rect.z1) / 2 })

type Range = [start: number, end: number]

/** Open-interval overlap: touching at an end doesn't count. */
const overlaps = (first: Range, second: Range) =>
  first[0] < second[1] - EPSILON && second[0] < first[1] - EPSILON

/** Floor furniture: what measures against others (not rugs, ceiling or wall items). */
const isStandingPiece = (type: ObjectType) =>
  !getItem(type).isUnderlay && !isOverhead(type) && !isWallMounted(type)

interface Measure {
  from: [number, number, number]
  to: [number, number, number]
  distance: number
}

interface Guide {
  from: [number, number, number]
  to: [number, number, number]
}

/** The free distance from a footprint to the nearest obstacle, per direction. */
interface Clearances {
  positiveX: number
  negativeX: number
  positiveZ: number
  negativeZ: number
}

/** Shortens the clearances by a wall (or door/window) segment in the way. */
const limitByEdge = (clearances: Clearances, rect: Rect, edge: SceneObject) => {
  // Distances are measured straight along X and Z: diagonal walls don't count.
  if (isDiagonalEdge(edge.rotation)) return

  const half = edgeLength(edge) / 2
  if (runsAlongX(edge.rotation)) {
    // A horizontal line at z = edge.z blocks ±Z when it spans our x range.
    if (!overlaps([rect.x0, rect.x1], [edge.x - half, edge.x + half])) return
    if (edge.z >= rect.z1 - EPSILON)
      clearances.positiveZ = Math.min(clearances.positiveZ, edge.z - rect.z1)
    if (edge.z <= rect.z0 + EPSILON)
      clearances.negativeZ = Math.min(clearances.negativeZ, rect.z0 - edge.z)

    return
  }

  if (!overlaps([rect.z0, rect.z1], [edge.z - half, edge.z + half])) return
  if (edge.x >= rect.x1 - EPSILON)
    clearances.positiveX = Math.min(clearances.positiveX, edge.x - rect.x1)
  if (edge.x <= rect.x0 + EPSILON)
    clearances.negativeX = Math.min(clearances.negativeX, rect.x0 - edge.x)
}

/** Shortens the clearances by another piece's footprint in the way. */
const limitByPiece = (clearances: Clearances, rect: Rect, other: Rect) => {
  if (overlaps([rect.z0, rect.z1], [other.z0, other.z1])) {
    if (other.x0 >= rect.x1 - EPSILON)
      clearances.positiveX = Math.min(clearances.positiveX, other.x0 - rect.x1)
    if (other.x1 <= rect.x0 + EPSILON)
      clearances.negativeX = Math.min(clearances.negativeX, rect.x0 - other.x1)
  }
  if (overlaps([rect.x0, rect.x1], [other.x0, other.x1])) {
    if (other.z0 >= rect.z1 - EPSILON)
      clearances.positiveZ = Math.min(clearances.positiveZ, other.z0 - rect.z1)
    if (other.z1 <= rect.z0 + EPSILON)
      clearances.negativeZ = Math.min(clearances.negativeZ, rect.z0 - other.z1)
  }
}

/**
 * The gaps around a footprint: from each of its four sides straight out to the
 * nearest wall (or door/window) or piece of floor furniture in the way, within
 * MAX. Touching (a gap of 0) isn't shown.
 */
const measure = (objects: SceneObject[], rect: Rect, ignoreId?: string): (Measure | null)[] => {
  const centre = centreOf(rect)
  const clearances: Clearances = {
    positiveX: Infinity,
    negativeX: Infinity,
    positiveZ: Infinity,
    negativeZ: Infinity,
  }
  for (const object of objects) {
    if (object.id === ignoreId || isMarker(object.type)) continue
    if (isEdgeType(object.type)) {
      limitByEdge(clearances, rect, object)

      continue
    }
    if (!isStandingPiece(object.type)) continue

    limitByPiece(clearances, rect, rectOf(object))
  }
  const slot = (distance: number, from: [number, number, number], to: [number, number, number]) =>
    distance > EPSILON && distance <= MAX ? { from, to, distance } : null
  const { positiveX, negativeX, positiveZ, negativeZ } = clearances

  return [
    slot(positiveX, [rect.x1, HEIGHT, centre.z], [rect.x1 + positiveX, HEIGHT, centre.z]),
    slot(negativeX, [rect.x0, HEIGHT, centre.z], [rect.x0 - negativeX, HEIGHT, centre.z]),
    slot(positiveZ, [centre.x, HEIGHT, rect.z1], [centre.x, HEIGHT, rect.z1 + positiveZ]),
    slot(negativeZ, [centre.x, HEIGHT, rect.z0], [centre.x, HEIGHT, rect.z0 - negativeZ]),
  ]
}

/** The first coordinate of `lines` that `otherLines` also has (within EPSILON), if any. */
const findSharedLine = (lines: number[], otherLines: number[]) =>
  lines.find((line) => otherLines.some((otherLine) => Math.abs(otherLine - line) < EPSILON))

/** A guide along Z where the pieces share an x line — for pieces apart along Z. */
const composeGuideAlongZ = (rect: Rect, other: Rect): Guide | null => {
  if (overlaps([rect.z0, rect.z1], [other.z0, other.z1])) return null

  const x = findSharedLine(
    [rect.x0, centreOf(rect).x, rect.x1],
    [other.x0, centreOf(other).x, other.x1]
  )
  if (x === undefined) return null

  const [gapStart, gapEnd] = other.z0 >= rect.z1 ? [rect.z1, other.z0] : [other.z1, rect.z0]

  return { from: [x, HEIGHT, gapStart], to: [x, HEIGHT, gapEnd] }
}

/** A guide along X where the pieces share a z line — for pieces apart along X. */
const composeGuideAlongX = (rect: Rect, other: Rect): Guide | null => {
  if (overlaps([rect.x0, rect.x1], [other.x0, other.x1])) return null

  const z = findSharedLine(
    [rect.z0, centreOf(rect).z, rect.z1],
    [other.z0, centreOf(other).z, other.z1]
  )
  if (z === undefined) return null

  const [gapStart, gapEnd] = other.x0 >= rect.x1 ? [rect.x1, other.x0] : [other.x1, rect.x0]

  return { from: [gapStart, HEIGHT, z], to: [gapEnd, HEIGHT, z] }
}

/**
 * Alignment guides: when a side (or the centre line) of the footprint lines up
 * with the same line of a nearby piece, a guide runs between them — the
 * closest one per axis, so it reads as "snapped in line with that".
 */
const guides = (objects: SceneObject[], rect: Rect, ignoreId?: string): (Guide | null)[] => {
  const centre = centreOf(rect)
  let bestX: { guide: Guide; distance: number } | null = null
  let bestZ: { guide: Guide; distance: number } | null = null
  for (const object of objects) {
    if (object.id === ignoreId || isMarker(object.type) || isEdgeType(object.type)) continue
    if (!isStandingPiece(object.type)) continue

    const other = rectOf(object)
    const otherCentre = centreOf(other)
    const distance = Math.hypot(otherCentre.x - centre.x, otherCentre.z - centre.z)
    if (distance > GUIDE_REACH) continue

    const guideX = composeGuideAlongZ(rect, other)
    if (guideX && (!bestX || distance < bestX.distance)) bestX = { guide: guideX, distance }

    const guideZ = composeGuideAlongX(rect, other)
    if (guideZ && (!bestZ || distance < bestZ.distance)) bestZ = { guide: guideZ, distance }
  }

  return [bestX?.guide ?? null, bestZ?.guide ?? null]
}

const formatDistance = (distance: number) =>
  `${Number.isInteger(distance) ? distance : distance.toFixed(1)} m`

interface Props {
  objects: SceneObject[]
  type: ObjectType
  x: number
  z: number
  rotation: number
  /** The piece being carried (it doesn't measure against itself). */
  ignoreId?: string
}

/**
 * While placing or carrying a piece of floor furniture: dashed lines with the
 * gap to whatever is next to it on each side, and cyan guides when it lines up
 * with a nearby piece.
 */
export const MeasureHints = ({ objects, type, x, z, rotation, ignoreId }: Props) => {
  const { gaps, lines } = useMemo(() => {
    if (isOverhead(type) || isWallMounted(type) || isMarker(type))
      return { gaps: [null, null, null, null], lines: [null, null] }

    const rect = rectOf({ type, rotation, x, z })

    return { gaps: measure(objects, rect, ignoreId), lines: guides(objects, rect, ignoreId) }
  }, [objects, type, x, z, rotation, ignoreId])

  // Every line stays mounted (hidden when unused) — see Ribbon.
  return (
    <group>
      {lines.map((guide, i) => (
        <Ribbon key={`g${i}`} segment={guide} color={GUIDE} />
      ))}
      {gaps.map((gap, i) => (
        <group key={`m${i}`}>
          <Ribbon segment={gap} color={MEASURE} dashed />
          {gap && (
            <Html
              position={[(gap.from[0] + gap.to[0]) / 2, HEIGHT, (gap.from[2] + gap.to[2]) / 2]}
              center
              zIndexRange={[20, 10]}
              style={{ pointerEvents: "none" }}
            >
              <span className="whitespace-nowrap rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
                {formatDistance(gap.distance)}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  )
}
