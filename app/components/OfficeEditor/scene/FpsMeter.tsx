import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

interface Props {
  /** Called ~5×/sec with the current average FPS and frame time (ms). */
  onSample: (fps: number, ms: number) => void
}

/**
 * Measures the *actual* render rate from inside R3F's loop. A DOM-side rAF
 * counter would be misleading because the Canvas runs `frameloop="demand"` —
 * only useFrame sees every real render. Enable continuous rendering
 * (`frameloop="always"`) while this is mounted to read a true idle FPS.
 */
export const FpsMeter = ({ onSample }: Props) => {
  const last = useRef(performance.now())
  const frames = useRef(0)
  const elapsed = useRef(0)

  useFrame(() => {
    const now = performance.now()
    const dt = now - last.current
    last.current = now
    frames.current += 1
    elapsed.current += dt

    // Report on a fixed ~200ms cadence so the readout is stable, not jittery.
    if (elapsed.current >= 200) {
      const fps = (frames.current * 1000) / elapsed.current
      onSample(fps, elapsed.current / frames.current)
      frames.current = 0
      elapsed.current = 0
    }
  })

  return null
}
