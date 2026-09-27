import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Mesh, MeshStandardMaterial } from "three"
import { NO_BAKE } from "./Baked"

/**
 * Steam needs frames even though the canvas renders on demand. One shared
 * ticker asks every canvas showing steam for a frame ~24 times a second (a
 * gentle rate: the wisps are slow and soft), and stops once no steam is left
 * or the tab is hidden.
 */
const FPS = 24
const canvases = new Map<() => void, number>()
let timer: ReturnType<typeof setInterval> | null = null

const subscribe = (invalidate: () => void) => {
  canvases.set(invalidate, (canvases.get(invalidate) ?? 0) + 1)
  timer ??= setInterval(() => {
    if (document.hidden) return
    for (const inv of canvases.keys()) inv()
  }, 1000 / FPS)
  return () => {
    const n = (canvases.get(invalidate) ?? 1) - 1
    if (n > 0) canvases.set(invalidate, n)
    else canvases.delete(invalidate)
    if (!canvases.size && timer) {
      clearInterval(timer)
      timer = null
    }
  }
}

const PUFFS = 4
const PERIOD = 2.6 // seconds for a puff to rise and fade
const RISE = 0.34

interface Props {
  position?: [number, number, number]
  /** Scales the whole plume (a pot steams more than a cup). */
  size?: number
}

/**
 * Soft wisps of steam curling up from hot food or a drink: a few puffs that
 * rise, swell, sway and fade on a loop, each a phase apart. Casts no shadow
 * and stays out of furniture baking (it animates).
 */
export const Steam = ({ position, size = 1 }: Props) => {
  const invalidate = useThree((s) => s.invalidate)
  const puffs = useRef<(Mesh | null)[]>([])
  // Each plume starts at its own point in the loop so neighbours don't pulse in step.
  const seed = useRef(Math.random() * PERIOD)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // Reduced motion: a still, faint plume (set once by the first frame below).
    if (reduced.current) {
      invalidate()
      return
    }
    return subscribe(invalidate)
  }, [invalidate])

  useFrame(({ clock }) => {
    const t = reduced.current ? 1 : clock.elapsedTime + seed.current
    puffs.current.forEach((m, i) => {
      if (!m) return
      const p = (t / PERIOD + i / PUFFS) % 1
      m.position.set(Math.sin(p * 5 + i) * 0.025, p * RISE, Math.cos(p * 4 + i * 2) * 0.015)
      m.scale.setScalar(0.035 + p * 0.07)
      // Fade in quickly, then out as it rises.
      const mat = m.material as MeshStandardMaterial
      mat.opacity = Math.min(p / 0.15, 1) * (1 - p) * 0.7
    })
  })

  return (
    <group position={position} scale={size} userData={NO_BAKE}>
      {Array.from({ length: PUFFS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            puffs.current[i] = m
          }}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={1}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
