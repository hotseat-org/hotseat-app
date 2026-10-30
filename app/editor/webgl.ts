let cached: boolean | undefined

/**
 * Whether the browser can create a WebGL context — the 3D scene (and editing)
 * needs it; without it the office shows as the 2D floor plan. Probed once.
 */
export const hasWebGL = () => {
  if (cached !== undefined) return cached
  if (typeof document === "undefined") return true

  try {
    const canvas = document.createElement("canvas")
    cached = !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    )
  } catch {
    cached = false
  }

  return cached
}
