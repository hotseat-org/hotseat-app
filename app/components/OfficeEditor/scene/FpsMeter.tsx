import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"

export interface FrameStats {
  fps: number
  /** Frame-to-frame time (ms). */
  ms: number
  /** JavaScript time per frame (ms): frame callbacks + three.js preparing and submitting the render. */
  cpuMs: number
  /** Draw calls per frame (all passes: shadows, post-processing…). */
  drawCalls: number
  triangles: number
  /** Objects in the scene graph — each one is visited every frame. */
  objects: number
}

interface Props {
  /** Called ~5×/sec with the averages since the last call. */
  onSample: (stats: FrameStats) => void
}

/** Runs before every other frame callback: marks the frame's start. */
const FIRST = -1000

/**
 * Measures the *actual* render rate from inside R3F's loop. A DOM-side rAF
 * counter would be misleading because the Canvas runs `frameloop="demand"` —
 * only useFrame sees every real render. Enable continuous rendering
 * (`frameloop="always"`) while this is mounted to read a true idle FPS.
 *
 * CPU time runs from the first frame callback to the end of the frame's last
 * render call (the post-processing composer renders several times a frame);
 * draw calls count every one of them.
 */
export const FpsMeter = ({ onSample }: Props) => {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const last = useRef(performance.now())
  const totals = useRef({ frames: 0, elapsed: 0, cpu: 0, drawCalls: 0, triangles: 0 })
  const frame = useRef({ start: 0, renderEnd: 0 })

  // Count every render call of the frame, not just the last one.
  useEffect(() => {
    const info = gl.info
    info.autoReset = false
    const render = gl.render
    gl.render = function (...args) {
      render.apply(this, args)
      frame.current.renderEnd = performance.now()
    }
    return () => {
      gl.render = render
      info.autoReset = true
    }
  }, [gl])

  useFrame(() => {
    const now = performance.now()
    const t = totals.current
    const f = frame.current
    // The previous frame, now complete.
    if (f.start && f.renderEnd > f.start) {
      t.cpu += f.renderEnd - f.start
      t.drawCalls += gl.info.render.calls
      t.triangles += gl.info.render.triangles
      t.frames += 1
      t.elapsed += now - last.current
    }
    gl.info.reset()
    last.current = now
    f.start = now

    // Report on a fixed ~200ms cadence so the readout is stable, not jittery.
    if (t.elapsed >= 200 && t.frames > 0) {
      let objects = 0
      scene.traverse(() => objects++)
      onSample({
        fps: (t.frames * 1000) / t.elapsed,
        ms: t.elapsed / t.frames,
        cpuMs: t.cpu / t.frames,
        drawCalls: Math.round(t.drawCalls / t.frames),
        triangles: Math.round(t.triangles / t.frames),
        objects,
      })
      totals.current = { frames: 0, elapsed: 0, cpu: 0, drawCalls: 0, triangles: 0 }
    }
  }, FIRST)

  return null
}
