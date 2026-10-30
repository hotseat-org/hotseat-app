import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type { Group } from "three"
import { isAmbientAwake, prefersReducedMotion, subscribeAmbient } from "../scene/ambient"
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
 * A GLB model that does a brief micro-wiggle every few seconds — only while
 * someone's looking (see ambient), never with reduced motion. Scheduling uses
 * a wall-clock timer (works under frameloop="demand"); the wiggle animates on
 * the shared ambient ticker, not at the display's full rate.
 */
export const WiggleModel = ({ url, scale = 1, yOffset = 0, rotationOffset = 0 }: Props) => {
  const ref = useRef<Group>(null)
  const elapsed = useRef<number | null>(null) // time within the current wiggle, or null when idle
  const stopFrames = useRef<(() => void) | null>(null)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    if (prefersReducedMotion()) return

    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (isAmbientAwake() && elapsed.current === null) {
            elapsed.current = 0
            stopFrames.current = subscribeAmbient(invalidate)
          }

          schedule()
        },
        2500 + Math.random() * 5000
      )
    }
    schedule()

    return () => {
      clearTimeout(timer)
      stopFrames.current?.()
      stopFrames.current = null
    }
  }, [invalidate])

  useFrame((state, delta) => {
    const group = ref.current
    if (!group || elapsed.current === null) return

    elapsed.current += Math.min(delta, 0.05)
    const seconds = elapsed.current
    if (seconds >= DURATION) {
      group.rotation.set(0, 0, 0)
      group.position.set(0, 0, 0)
      elapsed.current = null
      stopFrames.current?.()
      stopFrames.current = null

      return
    }

    const decay = 1 - seconds / DURATION
    const wobble = Math.sin(seconds * 24) * 0.16 * decay
    group.rotation.z = wobble
    group.rotation.y = wobble * 0.6
    group.position.y = Math.abs(Math.sin(seconds * 12)) * 0.05 * decay
    // The ticker fell asleep mid-wiggle: finish it, don't freeze mid-tilt.
    if (!isAmbientAwake()) state.invalidate()
  })

  return (
    // Animated — keep it out of furniture batching (see Baked).
    <group ref={ref} userData={NO_BAKE}>
      <Model url={url} scale={scale} yOffset={yOffset} rotationOffset={rotationOffset} />
    </group>
  )
}
