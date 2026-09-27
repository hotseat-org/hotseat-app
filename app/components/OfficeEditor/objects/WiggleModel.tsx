import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Group } from "three"
import { NO_BAKE } from "./Baked"
import { Model } from "./Model"

const DURATION = 0.9 // seconds per wiggle

interface Props {
  url: string
  scale?: number
  yOffset?: number
  rotationOffset?: number
}

/**
 * A GLB model that does a brief micro-wiggle every few seconds. Scheduling uses
 * a wall-clock timer (works under frameloop="demand"); the wiggle itself
 * animates with clamped per-frame delta and invalidates only while wiggling.
 */
export const WiggleModel = ({ url, scale = 1, yOffset = 0, rotationOffset = 0 }: Props) => {
  const ref = useRef<Group>(null)
  const elapsed = useRef<number | null>(null) // time within the current wiggle, or null when idle
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(
        () => {
          elapsed.current = 0
          invalidate() // kick the render loop for this wiggle
          schedule()
        },
        2500 + Math.random() * 5000
      )
    }
    schedule()
    return () => clearTimeout(timer)
  }, [invalidate])

  useFrame((state, delta) => {
    const g = ref.current
    if (!g || elapsed.current === null) return
    elapsed.current += Math.min(delta, 0.05)
    const t = elapsed.current
    if (t >= DURATION) {
      g.rotation.set(0, 0, 0)
      g.position.set(0, 0, 0)
      elapsed.current = null
      return
    }
    const decay = 1 - t / DURATION
    const wob = Math.sin(t * 24) * 0.16 * decay
    g.rotation.z = wob
    g.rotation.y = wob * 0.6
    g.position.y = Math.abs(Math.sin(t * 12)) * 0.05 * decay
    state.invalidate()
  })

  return (
    // Animated — keep it out of furniture batching (see Baked).
    <group ref={ref} userData={NO_BAKE}>
      <Model url={url} scale={scale} yOffset={yOffset} rotationOffset={rotationOffset} />
    </group>
  )
}
