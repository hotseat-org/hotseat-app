import type { GLProps } from "@react-three/fiber"
import { WebGPURenderer } from "three/webgpu"

/** What R3F hands a renderer factory (the canvas, among others). */
type DefaultProps = Parameters<Extract<GLProps, (props: never) => Promise<unknown>>>[0]

/**
 * The renderer every canvas uses: three.js's WebGPU renderer — WebGPU where
 * the browser has it, WebGL 2 where it doesn't (it falls back on its own).
 * Its materials are node materials, their shaders written in TSL (see
 * objects/surfaceShader.ts), the same for both.
 * For R3F's `gl` prop: R3F hands over the canvas, and waits for the renderer
 * to be ready. `?webgl` in the page's address forces the WebGL 2 backend (to
 * test the fallback on a browser that has WebGPU).
 */
export const createRenderer =
  ({ alpha = false, stencil = false }: { alpha?: boolean; stencil?: boolean } = {}) =>
  async ({ canvas }: DefaultProps) => {
    const renderer = new WebGPURenderer({
      canvas: canvas as HTMLCanvasElement,
      antialias: true,
      alpha,
      stencil,
      powerPreference: "high-performance",
      forceWebGL: new URLSearchParams(window.location.search).has("webgl"),
    })
    await renderer.init()

    return renderer
  }

/** The backend a WebGPU renderer runs on: WebGPU's device, or WebGL 2's context. */
interface Backend {
  isWebGPUBackend?: boolean
  device?: { limits: { maxTextureDimension2D: number } }
  gl?: WebGL2RenderingContext
}

/** The largest texture the GPU takes (px a side), on either backend. */
export const getMaxTextureSize = (renderer: unknown) => {
  const backend = (renderer as { backend?: Backend }).backend
  if (backend?.isWebGPUBackend && backend.device) return backend.device.limits.maxTextureDimension2D
  if (backend?.gl) return backend.gl.getParameter(backend.gl.MAX_TEXTURE_SIZE) as number

  return 4096
}
