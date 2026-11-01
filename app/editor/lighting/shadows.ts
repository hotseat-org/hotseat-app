import type { DirectionalLight, LightShadow, PointLight, SpotLight } from "three"

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

/** A shadow-casting light's ref: its shadow map is cached, drawn afresh when marked dirty. */
export const cacheShadow = (light: DirectionalLight | PointLight | SpotLight | null) => {
  const shadow = light?.shadow
  if (!shadow) return

  shadow.autoUpdate = false
  shadow.needsUpdate = true
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
