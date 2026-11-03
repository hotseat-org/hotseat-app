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
  ({ canvas }: DefaultProps) => {
    const element = canvas as HTMLCanvasElement
    const pending = creating.get(element)
    if (pending) return pending

    const renderer = new WebGPURenderer({
      canvas: element,
      antialias: true,
      alpha,
      stencil,
      powerPreference: "high-performance",
      forceWebGL: new URLSearchParams(window.location.search).has("webgl"),
    })
    const ready = renderer.init().then(() => renderer)
    creating.set(element, ready)
    const forget = () => creating.delete(element)
    ready.then(forget, forget)

    return ready
  }

/**
 * The renderers still starting, by canvas. R3F sets a canvas up again when
 * its size or props change, and makes a renderer while it has none — but
 * starting one takes a while, and a second set-up meanwhile would make a
 * second renderer on the same canvas. The one that finishes last is kept,
 * never sized: its buffers stay the canvas's default 300×150 and its frames
 * fail (WebGPU errors as the catalogue's stills are taken, or as a page opens
 * slowly). A second set-up gets the renderer already starting.
 */
const creating = new WeakMap<HTMLCanvasElement, Promise<WebGPURenderer>>()

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
