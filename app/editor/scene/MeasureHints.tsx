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

const rectOf = (type: ObjectType, rotation: number, x: number, z: number): Rect => {
  const [cellsX, cellsZ] = footprintCells(type, rotation)
  const halfX = (cellsX * GRID) / 2
  const halfZ = (cellsZ * GRID) / 2

  return { x0: x - halfX, x1: x + halfX, z0: z - halfZ, z1: z + halfZ }
}

/** Open-interval overlap: touching at an end doesn't count. */
const overlaps = (firstStart: number, firstEnd: number, secondStart: number, secondEnd: number) =>
  firstStart < secondEnd - EPSILON && secondStart < firstEnd - EPSILON

interface Measure {
  from: [number, number, number]
  to: [number, number, number]
  d: number
}

interface Guide {
  from: [number, number, number]
  to: [number, number, number]
}

/**
 * The gaps around a footprint: from each of its four sides straight out to the
 * nearest wall (or door/window) or piece of floor furniture in the way, within
 * MAX. Touching (a gap of 0) isn't shown.
 */
const measure = (objects: SceneObject[], rect: Rect, ignoreId?: string): (Measure | null)[] => {
  const centreX = (rect.x0 + rect.x1) / 2
  const centreZ = (rect.z0 + rect.z1) / 2
  // Nearest obstacle distance per direction.
  let positiveX = Infinity
  let negativeX = Infinity
  let positiveZ = Infinity
  let negativeZ = Infinity
  for (const object of objects) {
    if (object.id === ignoreId || isMarker(object.type)) continue
    if (isEdgeType(object.type)) {
      // Distances are measured straight along X and Z: diagonal walls don't count.
      if (isDiagonalEdge(object.rotation)) continue

      const half = edgeLength(object) / 2
      if (runsAlongX(object.rotation)) {
        // A horizontal line at z = o.z blocks ±Z when it spans our x range.
        if (!overlaps(rect.x0, rect.x1, object.x - half, object.x + half)) continue
        if (object.z >= rect.z1 - EPSILON) positiveZ = Math.min(positiveZ, object.z - rect.z1)
        if (object.z <= rect.z0 + EPSILON) negativeZ = Math.min(negativeZ, rect.z0 - object.z)
      } else {
        if (!overlaps(rect.z0, rect.z1, object.z - half, object.z + half)) continue
        if (object.x >= rect.x1 - EPSILON) positiveX = Math.min(positiveX, object.x - rect.x1)
        if (object.x <= rect.x0 + EPSILON) negativeX = Math.min(negativeX, rect.x0 - object.x)
      }

      continue
    }
    if (getItem(object.type).isUnderlay || isOverhead(object.type) || isWallMounted(object.type))
      continue

    const other = rectOf(object.type, object.rotation, object.x, object.z)
    if (overlaps(rect.z0, rect.z1, other.z0, other.z1)) {
      if (other.x0 >= rect.x1 - EPSILON) positiveX = Math.min(positiveX, other.x0 - rect.x1)
      if (other.x1 <= rect.x0 + EPSILON) negativeX = Math.min(negativeX, rect.x0 - other.x1)
    }
    if (overlaps(rect.x0, rect.x1, other.x0, other.x1)) {
      if (other.z0 >= rect.z1 - EPSILON) positiveZ = Math.min(positiveZ, other.z0 - rect.z1)
      if (other.z1 <= rect.z0 + EPSILON) negativeZ = Math.min(negativeZ, rect.z0 - other.z1)
    }
  }
  const slot = (distance: number, from: [number, number, number], to: [number, number, number]) =>
    distance > EPSILON && distance <= MAX ? { from, to, d: distance } : null

  return [
    slot(positiveX, [rect.x1, HEIGHT, centreZ], [rect.x1 + positiveX, HEIGHT, centreZ]),
    slot(negativeX, [rect.x0, HEIGHT, centreZ], [rect.x0 - negativeX, HEIGHT, centreZ]),
    slot(positiveZ, [centreX, HEIGHT, rect.z1], [centreX, HEIGHT, rect.z1 + positiveZ]),
    slot(negativeZ, [centreX, HEIGHT, rect.z0], [centreX, HEIGHT, rect.z0 - negativeZ]),
  ]
}

/**
 * Alignment guides: when a side (or the centre line) of the footprint lines up
 * with the same line of a nearby piece, a guide runs between them — the
 * closest one per axis, so it reads as "snapped in line with that".
 */
const guides = (objects: SceneObject[], rect: Rect, ignoreId?: string): (Guide | null)[] => {
  const centreX = (rect.x0 + rect.x1) / 2
  const centreZ = (rect.z0 + rect.z1) / 2
  let bestX: { g: Guide; d: number } | null = null
  let bestZ: { g: Guide; d: number } | null = null
  for (const object of objects) {
    if (object.id === ignoreId || isMarker(object.type) || isEdgeType(object.type)) continue
    if (getItem(object.type).isUnderlay || isOverhead(object.type) || isWallMounted(object.type))
      continue

    const other = rectOf(object.type, object.rotation, object.x, object.z)
    const otherCentreX = (other.x0 + other.x1) / 2
    const otherCentreZ = (other.z0 + other.z1) / 2
    const distance = Math.hypot(otherCentreX - centreX, otherCentreZ - centreZ)
    if (distance > GUIDE_REACH) continue
    // Lines along Z (constant x) shared by both, for pieces apart along Z.
    if (!overlaps(rect.z0, rect.z1, other.z0, other.z1)) {
      for (const x of [rect.x0, centreX, rect.x1]) {
        if (
          ![other.x0, otherCentreX, other.x1].some(
            (coordinate) => Math.abs(coordinate - x) < EPSILON
          )
        )
          continue

        const [gapStart, gapEnd] = other.z0 >= rect.z1 ? [rect.z1, other.z0] : [other.z1, rect.z0]
        if (!bestX || distance < bestX.d)
          bestX = { d: distance, g: { from: [x, HEIGHT, gapStart], to: [x, HEIGHT, gapEnd] } }

        break
      }
    }
    if (!overlaps(rect.x0, rect.x1, other.x0, other.x1)) {
      for (const z of [rect.z0, centreZ, rect.z1]) {
        if (
          ![other.z0, otherCentreZ, other.z1].some(
            (coordinate) => Math.abs(coordinate - z) < EPSILON
          )
        )
          continue

        const [gapStart, gapEnd] = other.x0 >= rect.x1 ? [rect.x1, other.x0] : [other.x1, rect.x0]
        if (!bestZ || distance < bestZ.d)
          bestZ = { d: distance, g: { from: [gapStart, HEIGHT, z], to: [gapEnd, HEIGHT, z] } }

        break
      }
    }
  }

  return [bestX?.g ?? null, bestZ?.g ?? null]
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

    const rect = rectOf(type, rotation, x, z)

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
                {formatDistance(gap.d)}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  )
}
