import type { WebGLRenderer } from "three"

/**
 * Shadows are cached: the renderer's shadow maps are NOT redrawn every frame
 * (`shadowMap.autoUpdate = false`, set in Scene) — only when something that
 * casts or receives them changes. Camera moves (orbit/pan/zoom) don't need new
 * shadow maps, which halves the draw calls of those frames (and at night the
 * lamps' point-light shadows cost 6 extra scene passes each).
 *
 * Anything that moves a shadow caster outside of a store update (animations,
 * async model loads, the wall cutaway) must call this.
 */
export const markShadowsDirty = (renderer: WebGLRenderer, invalidate?: () => void) => {
  renderer.shadowMap.needsUpdate = true
  invalidate?.()
}
