import { useLayoutEffect, useMemo } from "react"
import { Html } from "@react-three/drei"
import { DataTexture, NearestFilter, RepeatWrapping, RGBAFormat } from "three"
import { edgeLength, footprintCells, runsAlongX } from "../layout"
import {
  GRID,
  isEdgeType,
  isMarker,
  isOverhead,
  isWallMounted,
  type ObjectType,
  type SceneObject,
} from "../types"

/** Distances further than this aren't worth a label. */
const MAX = 4
/** Alignment guides look this far for a partner. */
const GUIDE_REACH = 8
const Y = 0.035
const MEASURE = "#3b82f6"
const GUIDE = "#3fd0ff"
const EPS = 1e-6
/** Line width (world units) and dash rhythm. */
const WIDTH = 0.03
const DASH = 0.14

type P3 = [number, number, number]

/** A 2-texel white/clear strip: repeated along a line it draws dashes. */
const dashTexture = () => {
  const t = new DataTexture(new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]), 2, 1, RGBAFormat)
  t.magFilter = NearestFilter
  t.minFilter = NearestFilter
  t.wrapS = RepeatWrapping
  t.needsUpdate = true
  return t
}

/**
 * A flat line on the floor from `from` to `to`, drawn as a thin ribbon with a
 * plain material (dashed via a repeating alpha texture). It stays mounted and
 * just hides when unused, and nothing about its material ever changes — so
 * its shader compiles once, not on every step (drei's Line rebuilt its
 * material whenever the points moved: hundreds of recompiles per carry).
 */
const Ribbon = ({
  seg,
  color,
  dashed,
}: {
  seg: { from: P3; to: P3 } | null
  color: string
  dashed?: boolean
}) => {
  const tex = useMemo(() => (dashed ? dashTexture() : null), [dashed])
  const dx = seg ? seg.to[0] - seg.from[0] : 0
  const dz = seg ? seg.to[2] - seg.from[2] : 0
  const len = Math.hypot(dx, dz)
  useLayoutEffect(() => {
    if (tex) tex.repeat.set(Math.max(1, len / DASH), 1)
  }, [tex, len])
  useLayoutEffect(() => () => tex?.dispose(), [tex])
  return (
    <group
      visible={!!seg && len > 0}
      position={
        seg ? [(seg.from[0] + seg.to[0]) / 2, Y, (seg.from[2] + seg.to[2]) / 2] : [0, -1, 0]
      }
      rotation={[0, -Math.atan2(dz, dx), 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[len || 0.001, WIDTH, 1]} renderOrder={2}>
        <planeGeometry />
        <meshBasicMaterial
          color={color}
          alphaMap={tex}
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
  const [cx, cz] = footprintCells(type, rotation)
  const hx = (cx * GRID) / 2
  const hz = (cz * GRID) / 2
  return { x0: x - hx, x1: x + hx, z0: z - hz, z1: z + hz }
}

/** Open-interval overlap: touching at an end doesn't count. */
const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 - EPS && b0 < a1 - EPS

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
const measure = (objects: SceneObject[], r: Rect, ignoreId?: string): (Measure | null)[] => {
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  // Nearest obstacle distance per direction.
  let px = Infinity
  let nx = Infinity
  let pz = Infinity
  let nz = Infinity
  for (const o of objects) {
    if (o.id === ignoreId || isMarker(o.type)) continue
    if (isEdgeType(o.type)) {
      const h = edgeLength(o) / 2
      if (runsAlongX(o.rotation)) {
        // A horizontal line at z = o.z blocks ±Z when it spans our x range.
        if (!overlaps(r.x0, r.x1, o.x - h, o.x + h)) continue
        if (o.z >= r.z1 - EPS) pz = Math.min(pz, o.z - r.z1)
        if (o.z <= r.z0 + EPS) nz = Math.min(nz, r.z0 - o.z)
      } else {
        if (!overlaps(r.z0, r.z1, o.z - h, o.z + h)) continue
        if (o.x >= r.x1 - EPS) px = Math.min(px, o.x - r.x1)
        if (o.x <= r.x0 + EPS) nx = Math.min(nx, r.x0 - o.x)
      }
      continue
    }
    if (o.type === "rug" || isOverhead(o.type) || isWallMounted(o.type)) continue
    const b = rectOf(o.type, o.rotation, o.x, o.z)
    if (overlaps(r.z0, r.z1, b.z0, b.z1)) {
      if (b.x0 >= r.x1 - EPS) px = Math.min(px, b.x0 - r.x1)
      if (b.x1 <= r.x0 + EPS) nx = Math.min(nx, r.x0 - b.x1)
    }
    if (overlaps(r.x0, r.x1, b.x0, b.x1)) {
      if (b.z0 >= r.z1 - EPS) pz = Math.min(pz, b.z0 - r.z1)
      if (b.z1 <= r.z0 + EPS) nz = Math.min(nz, r.z0 - b.z1)
    }
  }
  const slot = (d: number, from: [number, number, number], to: [number, number, number]) =>
    d > EPS && d <= MAX ? { from, to, d } : null
  return [
    slot(px, [r.x1, Y, cz], [r.x1 + px, Y, cz]),
    slot(nx, [r.x0, Y, cz], [r.x0 - nx, Y, cz]),
    slot(pz, [cx, Y, r.z1], [cx, Y, r.z1 + pz]),
    slot(nz, [cx, Y, r.z0], [cx, Y, r.z0 - nz]),
  ]
}

/**
 * Alignment guides: when a side (or the centre line) of the footprint lines up
 * with the same line of a nearby piece, a guide runs between them — the
 * closest one per axis, so it reads as "snapped in line with that".
 */
const guides = (objects: SceneObject[], r: Rect, ignoreId?: string): (Guide | null)[] => {
  const cx = (r.x0 + r.x1) / 2
  const cz = (r.z0 + r.z1) / 2
  let bestX: { g: Guide; d: number } | null = null
  let bestZ: { g: Guide; d: number } | null = null
  for (const o of objects) {
    if (o.id === ignoreId || isMarker(o.type) || isEdgeType(o.type)) continue
    if (o.type === "rug" || isOverhead(o.type) || isWallMounted(o.type)) continue
    const b = rectOf(o.type, o.rotation, o.x, o.z)
    const bcx = (b.x0 + b.x1) / 2
    const bcz = (b.z0 + b.z1) / 2
    const d = Math.hypot(bcx - cx, bcz - cz)
    if (d > GUIDE_REACH) continue
    // Lines along Z (constant x) shared by both, for pieces apart along Z.
    if (!overlaps(r.z0, r.z1, b.z0, b.z1)) {
      for (const x of [r.x0, cx, r.x1]) {
        if (![b.x0, bcx, b.x1].some((bx) => Math.abs(bx - x) < EPS)) continue
        const [a, c] = b.z0 >= r.z1 ? [r.z1, b.z0] : [b.z1, r.z0]
        if (!bestX || d < bestX.d) bestX = { d, g: { from: [x, Y, a], to: [x, Y, c] } }
        break
      }
    }
    if (!overlaps(r.x0, r.x1, b.x0, b.x1)) {
      for (const z of [r.z0, cz, r.z1]) {
        if (![b.z0, bcz, b.z1].some((bz) => Math.abs(bz - z) < EPS)) continue
        const [a, c] = b.x0 >= r.x1 ? [r.x1, b.x0] : [b.x1, r.x0]
        if (!bestZ || d < bestZ.d) bestZ = { d, g: { from: [a, Y, z], to: [c, Y, z] } }
        break
      }
    }
  }
  return [bestX?.g ?? null, bestZ?.g ?? null]
}

const fmt = (d: number) => `${Number.isInteger(d) ? d : d.toFixed(1)} m`

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
    const r = rectOf(type, rotation, x, z)
    return { gaps: measure(objects, r, ignoreId), lines: guides(objects, r, ignoreId) }
  }, [objects, type, x, z, rotation, ignoreId])

  // Every line stays mounted (hidden when unused) — see Ribbon.
  return (
    <group>
      {lines.map((g, i) => (
        <Ribbon key={`g${i}`} seg={g} color={GUIDE} />
      ))}
      {gaps.map((m, i) => (
        <group key={`m${i}`}>
          <Ribbon seg={m} color={MEASURE} dashed />
          {m && (
            <Html
              position={[(m.from[0] + m.to[0]) / 2, Y, (m.from[2] + m.to[2]) / 2]}
              center
              zIndexRange={[20, 10]}
              style={{ pointerEvents: "none" }}
            >
              <span className="whitespace-nowrap rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
                {fmt(m.d)}
              </span>
            </Html>
          )}
        </group>
      ))}
    </group>
  )
}
