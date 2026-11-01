import type { DirectionalLight, LightShadow, PointLight, SpotLight } from "three"
import { PCFSoftShadowFilter, reference, vec2, vec3 } from "three/tsl"
import type { Node } from "three/webgpu"

/**
 * Shadows are cached: a light's shadow map is NOT redrawn every frame
 * (`shadow.autoUpdate = false`) — only when something that casts or receives
 * them changes. Camera moves (orbit/pan/zoom) don't need new shadow maps,
 * which halves the draw calls of those frames (and at night the lamps'
 * point-light shadows cost 6 extra scene passes each).
 *
 * Every shadow-casting light joins with `cacheShadow` (its ref). Anything that
 * moves a shadow caster outside of a store update (animations, async model
 * loads, the wall cutaway) must call `markShadowsDirty`.
 */
const cachedShadows = new Set<LightShadow>()

/** What three hands a shadow filter: the map, where this pixel falls on it, and the light's shadow. */
interface ShadowFilterInputs {
  depthTexture: Node
  shadowCoord: Node<"vec3">
  shadow: LightShadow
  depthLayer: Node
}

/** three's smooth 3×3 shadow filter, as three calls it (its typings say otherwise). */
const filterSmoothly = PCFSoftShadowFilter as unknown as (
  inputs: ShadowFilterInputs
) => Node<"float">

/**
 * A soft, smooth sun shadow: the smooth 3×3 filter (PCFSoft) at four points
 * spread over the shadow's radius, averaged. three's WebGPU PCF spreads its
 * few samples with per-pixel noise instead — grainy speckle along every edge,
 * worst under thin things (a monitor's stand, a railing, a lamp's pole).
 */
const softShadowFilter = (inputs: ShadowFilterInputs) => {
  const { shadowCoord, shadow } = inputs
  const reach = reference("radius", "float", shadow)
    .mul(0.5)
    .div(reference("mapSize", "vec2", shadow))
  const at = (x: number, y: number) =>
    filterSmoothly({
      ...inputs,
      shadowCoord: vec3(shadowCoord.xy.add(vec2(x, y).mul(reach)), shadowCoord.z),
    })

  return at(-1, -1).add(at(1, -1)).add(at(-1, 1)).add(at(1, 1)).mul(0.25)
}

/** A shadow-casting light's ref: its shadow map is cached, drawn afresh when marked dirty. */
export const cacheShadow = (light: DirectionalLight | PointLight | SpotLight | null) => {
  const shadow = light?.shadow
  if (!shadow) return

  shadow.autoUpdate = false
  shadow.needsUpdate = true
  // The sun's: soft and smooth (point lights filter their own way).
  if ((light as DirectionalLight).isDirectionalLight)
    (shadow as LightShadow & { filterNode?: unknown }).filterNode = softShadowFilter

  cachedShadows.add(shadow)

  return () => {
    cachedShadows.delete(shadow)
  }
}

/** Every cached shadow map is drawn afresh with the next frame (asked for, if `invalidate`). */
export const markShadowsDirty = (invalidate?: () => void) => {
  for (const shadow of cachedShadows) shadow.needsUpdate = true
  invalidate?.()
}
