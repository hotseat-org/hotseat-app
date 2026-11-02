import { createContext, useContext } from "react"
import { BufferAttribute, Vector4, type BufferGeometry, type Vector3 } from "three"
import {
  abs,
  attribute,
  dot,
  float,
  frontFacing,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionWorld,
  select,
  smoothstep,
  uniformArray,
  vec2,
  vec4,
} from "three/tsl"
import type { Node } from "three/webgpu"
import { WALL } from "../objects/dimensions"
import { shownFloorUniform } from "../objects/floorHeight"

/**
 * The wall cutaway, done on the GPU: walls, posts, doors, windows and wall
 * items share a few shader nodes (TSL) that read a few cuts from one shared
 * uniform and drop what's above each cut's height. Moving the cutaway only
 * updates those numbers (see WallXray) — no re-render, no geometry rebuild, no
 * material swap — so it keeps up with the fastest cursor.
 */

/** Cuts the shader reads at once (more just wait their turn to fade in). */
export const MAX_CUTS = 4

/**
 * Each cut: (direction, line, centre, amount). `direction` is which way the cut
 * wall runs (CUT_DIRECTION); `line` is where it lies across that direction and
 * `centre` the cut's middle along it (both measured with cutAxes); `amount`
 * 0…1 how far it's cut down (0 = not at all).
 */
export const cutawayUniform = {
  value: Array.from({ length: MAX_CUTS }, () => new Vector4()),
}
/** The same cuts, as the shader reads them (the very same vectors, sent every frame). */
const cuts = uniformArray<"vec4">(cutawayUniform.value, "vec4")

/** Fully cut within FULL of the centre (m), easing back up to full height by REACH. */
const FULL = 1.25
const REACH = 4.5
/** A wall crossing the cut one: fully cut within this of the junction, back by CROSS_REACH. */
const CROSS_FULL = 0.9
const CROSS_REACH = 3
/** Fully cut walls are sliced down to this height (m). */
const CUT_HEIGHT = 0.3
/** Clip height when not cut — safely above everything wall-mounted. */
const CUT_TOP = WALL.height + 0.5
/** The cut-open top's light: the ambient, this much stronger (no sun, so no shadows). */
const CAP_LIGHT = 1.6

/**
 * How far a piece's anchor (its origin: a run's middle, a door's spot on its
 * wall) may sit from a cut's line and still be on that wall (m): on the line
 * for walls, posts and openings; wall items hang a little out from the face.
 * The anchor decides, not each pixel: a door's frame juts past the wall's faces
 * and an open leaf swings well clear of it, yet they go with their wall.
 */
export const CUT_BAND = { wall: 0.05, item: WALL.depth / 2 + 0.4 }

/** Wall directions as the shader numbers them. */
export const CUT_DIRECTION = { x: 0, z: 1, rising: 2, falling: 3 } as const
type CutDirection = (typeof CUT_DIRECTION)[keyof typeof CUT_DIRECTION]

/** Each direction's unit vectors on the floor (along, across) (by CUT_DIRECTION). */
const DIAGONAL = Math.SQRT1_2
const AXES: Record<"along" | "across", [number, number][]> = {
  along: [
    [1, 0],
    [0, 1],
    [DIAGONAL, DIAGONAL],
    [DIAGONAL, -DIAGONAL],
  ],
  across: [
    [0, 1],
    [1, 0],
    [-DIAGONAL, DIAGONAL],
    [DIAGONAL, DIAGONAL],
  ],
}

/** A direction's unit vectors on the floor (x, z): along the wall, and across it. */
export const cutAxes = (
  direction: number
): { along: [number, number]; across: [number, number] } => ({
  along: AXES.along[direction] ?? AXES.along[CUT_DIRECTION.x],
  across: AXES.across[direction] ?? AXES.across[CUT_DIRECTION.x],
})

/** The direction a piece runs, from its local X axis in the world (x, z). */
export const cutDirectionOf = (directionX: number, directionZ: number): CutDirection => {
  const length = Math.hypot(directionX, directionZ) || 1
  const x = directionX / length
  const z = directionZ / length
  if (Math.abs(x) > 0.92) return CUT_DIRECTION.x
  if (Math.abs(z) > 0.92) return CUT_DIRECTION.z

  return x * z > 0 ? CUT_DIRECTION.rising : CUT_DIRECTION.falling
}

/** A direction (CUT_DIRECTION) from a way along the floor (x, z), in the shader. */
const getCutDirection = (direction: Node<"vec2">) => {
  const unit = normalize(direction)

  return select(
    abs(unit.x).greaterThan(0.92),
    float(CUT_DIRECTION.x),
    select(
      abs(unit.y).greaterThan(0.92),
      float(CUT_DIRECTION.z),
      select(
        unit.x.mul(unit.y).greaterThan(0),
        float(CUT_DIRECTION.rising),
        float(CUT_DIRECTION.falling)
      )
    )
  )
}

/** The vector for a direction (CUT_DIRECTION), in the shader. */
const pickByDirection = (direction: Node<"float">, [x, z, rising, falling]: [number, number][]) =>
  select(
    direction.lessThan(0.5),
    vec2(...x),
    select(
      direction.lessThan(1.5),
      vec2(...z),
      select(direction.lessThan(2.5), vec2(...rising), vec2(...falling))
    )
  )

/** A direction's unit vectors on the floor (as cutAxes), in the shader. */
const getCutAxes = (direction: Node<"float">) => ({
  along: pickByDirection(direction, AXES.along),
  across: pickByDirection(direction, AXES.across),
})

/**
 * Where a piece is anchored and which way it runs: from its own transform
 * (one piece per mesh) or, in a merged mesh holding many, from per-vertex
 * attributes (see setCutAttributes).
 */
const getAnchor = (isMerged: boolean) =>
  isMerged
    ? {
        position: modelWorldMatrix.mul(vec4(attribute<"vec3">("cutAnchor", "vec3"), 1)).xyz,
        direction: attribute<"float">("cutAxis", "float"),
      }
    : {
        position: modelWorldMatrix.mul(vec4(0, 0, 0, 1)).xyz,
        // Which way the piece runs: its local X (along its wall) in the world.
        direction: getCutDirection(modelWorldMatrix.mul(vec4(1, 0, 0, 0)).xz),
      }

/** How far this pixel is cut down (0…1), by the deepest cut it's under. */
const getCutDepth = (band: number, isMerged: boolean) => {
  const anchor = getAnchor(isMerged)
  let depth: Node<"float"> = float(0)
  for (let i = 0; i < MAX_CUTS; i++) {
    const cut = cuts.element(i)
    const axes = getCutAxes(cut.x)
    const along = dot(positionWorld.xz, axes.along)
    const across = dot(positionWorld.xz, axes.across)
    const cutAlong = float(1).sub(smoothstep(FULL, REACH, abs(along.sub(cut.z))))
    // Along the cut wall: on its line (by the anchor), or not at all.
    const anchorAcross = dot(anchor.position.xz, axes.across)
    const onItsLine = select(abs(anchorAcross.sub(cut.y)).lessThanEqual(band), cutAlong, float(0))
    // Crossing it: cut down at the junction, back up along its length.
    const crossing = cutAlong.mul(
      float(1).sub(smoothstep(CROSS_FULL, CROSS_REACH, abs(across.sub(cut.y))))
    )
    const amount = select(abs(anchor.direction.sub(cut.x)).lessThan(0.5), onItsLine, crossing)
    depth = max(depth, cut.w.mul(amount))
  }

  return depth
}

/**
 * The cutaway's nodes for a surface it slices: which pixels stay (`mask`), and
 * how its cut-open inside is lit (`isCutInside`: see surfaceShader.ts). A
 * see-through surface (`isSeeThrough`: glass) isn't sliced but fades (`fade`,
 * its opacity's share) as deep as it's cut: sliced, its curved cut edge read
 * as a veil hanging in the air, and its back faces showed through its front.
 */
const createCutaway = (band: number, { isMerged = false, isSeeThrough = false } = {}) => {
  const depth = getCutDepth(band, isMerged)
  if (isSeeThrough)
    return { mask: frontFacing, isCutInside: frontFacing.not(), fade: float(1).sub(depth) }

  // Above the shown floor: a floor arriving a storey up isn't sliced at the
  // ground floor's wall height (floors below never are).
  const height = positionWorld.y.sub(shownFloorUniform)
  const isBelowCut = height.lessThanEqual(mix(CUT_TOP, CUT_HEIGHT, depth))
  // Inner faces only show where it's cut open.
  const isShownFace = frontFacing.or(depth.greaterThanEqual(0.001))

  return { mask: isBelowCut.and(isShownFace), isCutInside: frontFacing.not(), fade: null }
}

/** The cut-open top's light: a share of the ambient (no sun, so no shadows). */
export const CUT_INSIDE_LIGHT = CAP_LIGHT

/**
 * "wall" / "item": the band (see CUT_BAND). "merged…": many pieces in one
 * mesh, each vertex carrying its piece's anchor and direction. (Applied with
 * the rest of a surface's shader — see objects/surfaceShader.ts.)
 */
export const CUTAWAYS = {
  wall: createCutaway(CUT_BAND.wall),
  item: createCutaway(CUT_BAND.item),
  mergedWall: createCutaway(CUT_BAND.wall, { isMerged: true }),
  mergedItem: createCutaway(CUT_BAND.item, { isMerged: true }),
  wallGlass: createCutaway(CUT_BAND.wall, { isSeeThrough: true }),
  itemGlass: createCutaway(CUT_BAND.item, { isSeeThrough: true }),
  mergedWallGlass: createCutaway(CUT_BAND.wall, { isMerged: true, isSeeThrough: true }),
  mergedItemGlass: createCutaway(CUT_BAND.item, { isMerged: true, isSeeThrough: true }),
}
export type CutawayKind = keyof typeof CUTAWAYS

/** The see-through variant of each kind (glass in a wall, a door, a window). */
export const GLASS_KIND: Record<CutawayKind, CutawayKind> = {
  wall: "wallGlass",
  item: "itemGlass",
  mergedWall: "mergedWallGlass",
  mergedItem: "mergedItemGlass",
  wallGlass: "wallGlass",
  itemGlass: "itemGlass",
  mergedWallGlass: "mergedWallGlass",
  mergedItemGlass: "mergedItemGlass",
}

/** The merged variant of a single-piece kind. */
export const MERGED_KIND = {
  wall: "mergedWall",
  item: "mergedItem",
  wallGlass: "mergedWallGlass",
  itemGlass: "mergedItemGlass",
} as const

/** Inside one: the Surfaces below are sliced by the cutaway (of this kind). */
export const CutawayContext = createContext<CutawayKind | null>(null)
export const useCutaway = () => useContext(CutawayContext)

/**
 * Give every vertex of one piece's geometry the piece's anchor (in the merged
 * mesh's space) and the way it runs (0 = along X, 1 = along Z), before merging
 * it with others into a "merged…" cutaway mesh. `axis`: a CUT_DIRECTION.
 */
export const setCutAttributes = (geometry: BufferGeometry, anchor: Vector3, axis: number) => {
  const count = geometry.getAttribute("position").count
  const anchors = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    anchors[i] = anchor.x
    anchors[i + 1] = anchor.y
    anchors[i + 2] = anchor.z
  }
  geometry.setAttribute("cutAnchor", new BufferAttribute(anchors, 3))
  geometry.setAttribute("cutAxis", new BufferAttribute(new Float32Array(count).fill(axis), 1))

  return geometry
}
