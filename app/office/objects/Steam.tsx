import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Mesh, MeshStandardMaterial } from "three"
import { prefersReducedMotion, subscribeAmbient } from "~/editor/ambient"
import { NO_BAKE } from "~/editor/objects/Baked"

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
  const invalidate = useThree((state) => state.invalidate)
  const puffs = useRef<(Mesh | null)[]>([])
  // Each plume starts at its own point in the loop so neighbours don't pulse in step.
  const seed = useRef(Math.random() * PERIOD)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current = prefersReducedMotion()
    // Reduced motion: a still, faint plume (set once by the first frame below).
    if (reduced.current) {
      invalidate()

      return
    }

    return subscribeAmbient(invalidate)
  }, [invalidate])

  useFrame(({ clock }) => {
    const time = reduced.current ? 1 : clock.elapsedTime + seed.current
    puffs.current.forEach((puff, i) => {
      if (!puff) return

      const progress = (time / PERIOD + i / PUFFS) % 1
      puff.position.set(
        Math.sin(progress * 5 + i) * 0.025,
        progress * RISE,
        Math.cos(progress * 4 + i * 2) * 0.015
      )
      puff.scale.setScalar(0.035 + progress * 0.07)
      // Fade in quickly, then out as it rises.
      const material = puff.material as MeshStandardMaterial
      material.opacity = Math.min(progress / 0.15, 1) * (1 - progress) * 0.7
    })
  })

  return (
    <group position={position} scale={size} userData={NO_BAKE}>
      {Array.from({ length: PUFFS }, (_, i) => (
        <mesh
          key={i}
          // Starts at its smallest puff size (useFrame takes over): a unit-sized
          // puff would inflate bounds measured before the first frame — e.g. a
          // catalog still framing the whole table tiny around it.
          scale={0.035}
          ref={(puff) => {
            puffs.current[i] = puff
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
