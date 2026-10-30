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
  const renderer = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const last = useRef(performance.now())
  const totals = useRef({ frames: 0, elapsed: 0, cpu: 0, drawCalls: 0, triangles: 0 })
  const frame = useRef({ start: 0, renderEnd: 0 })

  // Count every render call of the frame, not just the last one.
  useEffect(() => {
    const info = renderer.info
    info.autoReset = false
    const render = renderer.render
    renderer.render = function (...args) {
      render.apply(this, args)
      frame.current.renderEnd = performance.now()
    }

    return () => {
      renderer.render = render
      info.autoReset = true
    }
  }, [renderer])

  useFrame(() => {
    const now = performance.now()
    const sums = totals.current
    const timing = frame.current
    // The previous frame, now complete.
    if (timing.start && timing.renderEnd > timing.start) {
      sums.cpu += timing.renderEnd - timing.start
      sums.drawCalls += renderer.info.render.calls
      sums.triangles += renderer.info.render.triangles
      sums.frames += 1
      sums.elapsed += now - last.current
    }

    renderer.info.reset()
    last.current = now
    timing.start = now

    // Report on a fixed ~200ms cadence so the readout is stable, not jittery.
    if (sums.elapsed >= 200 && sums.frames > 0) {
      let objects = 0
      scene.traverse(() => objects++)
      onSample({
        fps: (sums.frames * 1000) / sums.elapsed,
        ms: sums.elapsed / sums.frames,
        cpuMs: sums.cpu / sums.frames,
        drawCalls: Math.round(sums.drawCalls / sums.frames),
        triangles: Math.round(sums.triangles / sums.frames),
        objects,
      })
      totals.current = { frames: 0, elapsed: 0, cpu: 0, drawCalls: 0, triangles: 0 }
    }
  }, FIRST)

  return null
}
