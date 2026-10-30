import { createContext, useContext } from "react"
import {
  BufferAttribute,
  Vector4,
  type BufferGeometry,
  type Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three"
import { WALL } from "../objects/dimensions"

/**
 * The wall cutaway, done on the GPU: walls, posts, doors, windows and wall
 * items share a small shader patch that reads a few cuts from one shared
 * uniform and drops what's above each cut's height. Moving the cutaway only
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
/** The cut-open top's light: a share of the ambient (no sun, so no shadows). */
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

/** A direction's unit vectors on the floor (x, z): along the wall, and across it. */
export const cutAxes = (
  direction: number
): { along: [number, number]; across: [number, number] } => {
  const diagonal = Math.SQRT1_2
  switch (direction) {
    case CUT_DIRECTION.z:
      return { along: [0, 1], across: [1, 0] }
    case CUT_DIRECTION.rising:
      return { along: [diagonal, diagonal], across: [-diagonal, diagonal] }
    case CUT_DIRECTION.falling:
      return { along: [diagonal, -diagonal], across: [diagonal, diagonal] }
    default:
      return { along: [1, 0], across: [0, 1] }
  }
}

/** The direction a piece runs, from its local X axis in the world (x, z). */
export const cutDirectionOf = (directionX: number, directionZ: number): CutDirection => {
  const length = Math.hypot(directionX, directionZ) || 1
  const x = directionX / length
  const z = directionZ / length
  if (Math.abs(x) > 0.92) return CUT_DIRECTION.x
  if (Math.abs(z) > 0.92) return CUT_DIRECTION.z
  return x * z > 0 ? CUT_DIRECTION.rising : CUT_DIRECTION.falling
}

/** The same in GLSL, and a direction's axes. */
const CUT_DIRECTION_GLSL = /* glsl */ `
  float cutDirectionOf(vec2 d) {
    d = normalize(d);
    if (abs(d.x) > 0.92) return 0.0;
    if (abs(d.y) > 0.92) return 1.0;
    return d.x * d.y > 0.0 ? 2.0 : 3.0;
  }`
const CUT_AXES_GLSL = /* glsl */ `
  void cutAxes(float direction, out vec2 along, out vec2 across) {
    float h = 0.70710678;
    if (direction < 0.5) { along = vec2(1.0, 0.0); across = vec2(0.0, 1.0); }
    else if (direction < 1.5) { along = vec2(0.0, 1.0); across = vec2(1.0, 0.0); }
    else if (direction < 2.5) { along = vec2(h, h); across = vec2(-h, h); }
    else { along = vec2(h, -h); across = vec2(h, h); }
  }`

const glsl = (value: number) => value.toFixed(4)

/**
 * Where each piece is anchored and which way it runs: from its own transform
 * (one piece per mesh) or, in a merged mesh holding many, from per-vertex
 * attributes (see setCutAttributes).
 */
const ANCHOR_FROM_MATRIX = /* glsl */ `
  vCutAnchor = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // Which way the piece runs: its local X (along its wall) in the world.
  vCutAxis = cutDirectionOf((modelMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xz);`
const ANCHOR_FROM_ATTRIBUTES = /* glsl */ `
  vCutAnchor = (modelMatrix * vec4(cutAnchor, 1.0)).xyz;
  vCutAxis = cutAxis;`

const createPatch =
  (band: number, isMerged: boolean) => (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.cutaways = cutawayUniform
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vCutWorld;
      varying vec3 vCutAnchor;
      varying float vCutAxis;
      ${isMerged ? "attribute vec3 cutAnchor;\nattribute float cutAxis;" : CUT_DIRECTION_GLSL}`
      )
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>
      vCutWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      ${isMerged ? ANCHOR_FROM_ATTRIBUTES : ANCHOR_FROM_MATRIX}`
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
      uniform vec4 cutaways[${MAX_CUTS}];
      varying vec3 vCutWorld;
      varying vec3 vCutAnchor;
      varying float vCutAxis;
      ${CUT_AXES_GLSL}
      float cutawayDepth(vec3 p) {
        float depth = 0.0;
        for (int i = 0; i < ${MAX_CUTS}; i++) {
          vec4 cut = cutaways[i];
          if (cut.w <= 0.0) continue;
          vec2 alongAxis;
          vec2 acrossAxis;
          cutAxes(cut.x, alongAxis, acrossAxis);
          float along = dot(p.xz, alongAxis);
          float across = dot(p.xz, acrossAxis);
          float cutAlong = 1.0 - smoothstep(${glsl(FULL)}, ${glsl(REACH)}, abs(along - cut.z));
          float k;
          if (abs(vCutAxis - cut.x) < 0.5) {
            // Along the cut wall: on its line (by the anchor), or not at all.
            float anchorAcross = dot(vCutAnchor.xz, acrossAxis);
            k = abs(anchorAcross - cut.y) <= ${glsl(band)} ? cutAlong : 0.0;
          } else {
            // Crossing it: cut down at the junction, back up along its length.
            k = cutAlong * (1.0 - smoothstep(${glsl(CROSS_FULL)}, ${glsl(CROSS_REACH)}, abs(across - cut.y)));
          }
          depth = max(depth, cut.w * k);
        }
        return depth;
      }`
      )
      .replace(
        "#include <clipping_planes_fragment>",
        /* glsl */ `#include <clipping_planes_fragment>
      float cutDepth = cutawayDepth(vCutWorld);
      if (vCutWorld.y > mix(${glsl(CUT_TOP)}, ${glsl(CUT_HEIGHT)}, cutDepth)) discard;
      // Inner faces only show where it's cut open.
      if (!gl_FrontFacing && cutDepth < 0.001) discard;`
      )
      .replace(
        "#include <aomap_fragment>",
        /* glsl */ `#include <aomap_fragment>
      // The cut-open inside: lit by the ambient alone. The (cached) shadow
      // maps still hold the uncut wall, which would stripe it dark.
      if (!gl_FrontFacing) {
        reflectedLight.directDiffuse = reflectedLight.indirectDiffuse * ${glsl(CAP_LIGHT - 1)};
        reflectedLight.directSpecular = vec3(0.0);
      }`
      )
  }

/** The shader patch for a surface the cutaway slices, and its program key. */
const createCutawayPatch = (band: number, isMerged = false) => ({
  patch: createPatch(band, isMerged),
  key: `cutaway-${band}${isMerged ? "-merged" : ""}`,
})
/**
 * "wall" / "item": the band (see CUT_BAND). "merged…": many pieces in one
 * mesh, each vertex carrying its piece's anchor and direction. (Applied with
 * the rest of a surface's shader — see objects/surfaceShader.ts.)
 */
export const CUTAWAY_PATCHES = {
  wall: createCutawayPatch(CUT_BAND.wall),
  item: createCutawayPatch(CUT_BAND.item),
  mergedWall: createCutawayPatch(CUT_BAND.wall, true),
  mergedItem: createCutawayPatch(CUT_BAND.item, true),
}
export type CutawayKind = keyof typeof CUTAWAY_PATCHES
/** The merged variant of a single-piece kind. */
export const MERGED_KIND = { wall: "mergedWall", item: "mergedItem" } as const

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
