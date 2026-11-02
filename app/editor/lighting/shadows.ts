import type { DirectionalLight, LightShadow, PointLight, SpotLight, Texture } from "three"
import { reference, texture, vec2 } from "three/tsl"
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
  /** The shadow map (a depth texture, though three's typings say a node). */
  depthTexture: Node
  shadowCoord: Node<"vec3">
  shadow: LightShadow
  depthLayer: Node
}

/** Samples of the sun's shadow filter, and how far out they reach (× the shadow's radius, in texels). */
const SAMPLES = 8
const SPREAD = 0.85
/** The samples' spots: a sunflower disk, the same for every pixel (no noise, so no grain). */
const DISK = Array.from({ length: SAMPLES }, (_, index) => {
  const distance = Math.sqrt((index + 0.5) / SAMPLES)
  const angle = index * 2.399963 // the golden angle

  return [Math.cos(angle) * distance, Math.sin(angle) * distance] as const
})

/**
 * A soft, smooth sun shadow: eight looks into the shadow map on a fixed disk,
 * each one filtered by the GPU itself (a comparison sampler, filtered
 * linearly: a smooth 2×2 for free), averaged. Smooth without per-pixel
 * noise — three's WebGPU PCF spreads its few samples with noise: grainy
 * speckle along every edge, worst under thin things (a monitor's stand, a
 * railing, a lamp's pole). It took four of three's smooth 3×3 filters before
 * (16 gathers a pixel): about as soft, at half the reads into the map — and
 * every lit pixel on screen pays for them.
 */
const softShadowFilter = ({ depthTexture, shadowCoord, shadow }: ShadowFilterInputs) => {
  const reach = reference("radius", "float", shadow)
    .mul(SPREAD)
    .div(reference("mapSize", "vec2", shadow))
  const lookAt = ([x, y]: readonly [number, number]) =>
    texture(depthTexture as unknown as Texture, shadowCoord.xy.add(vec2(x, y).mul(reach))).compare(
      shadowCoord.z
    ).x

  return DISK.map(lookAt)
    .reduce((sum, sample) => sum.add(sample))
    .mul(1 / SAMPLES)
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
