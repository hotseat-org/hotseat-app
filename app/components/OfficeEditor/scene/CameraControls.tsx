import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import { Vector3 } from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { isTypingTarget } from "../keyboard"

const PAN_KEYS: Record<string, true> = { w: true, a: true, s: true, d: true }
const UP = new Vector3(0, 1, 0)

/**
 * WASD panning for the (orthographic) camera. Moves the camera and the orbit
 * target together along the ground plane, relative to the current view yaw.
 * Speed scales with zoom so it feels consistent at any zoom level.
 */
export const CameraControls = () => {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const invalidate = useThree((s) => s.invalidate)
  const keys = useRef<Set<string>>(new Set())

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Not while typing, and not with modifiers: on macOS the keyup of a key
      // released while ⌘ is held never fires, so ⌘+A/⌘+S would pan forever.
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (!PAN_KEYS[k]) return
      keys.current.add(k)
      invalidate() // frameloop="demand": start the render loop for the pan
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const clear = () => keys.current.clear()
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    window.addEventListener("blur", clear)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      window.removeEventListener("blur", clear)
    }
  }, [invalidate])

  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())
  const move = useRef(new Vector3())

  useFrame((_, dt) => {
    if (!controls || keys.current.size === 0) return

    // Forward = camera view direction flattened onto the ground.
    camera.getWorldDirection(forward.current)
    forward.current.y = 0
    if (forward.current.lengthSq() < 1e-6) return
    forward.current.normalize()
    right.current.crossVectors(forward.current, UP).normalize()

    move.current.set(0, 0, 0)
    if (keys.current.has("w")) move.current.add(forward.current)
    if (keys.current.has("s")) move.current.sub(forward.current)
    if (keys.current.has("d")) move.current.add(right.current)
    if (keys.current.has("a")) move.current.sub(right.current)
    if (move.current.lengthSq() === 0) return

    const zoom = (camera as { zoom?: number }).zoom ?? 1
    const speed = (420 / zoom) * dt
    move.current.normalize().multiplyScalar(speed)

    camera.position.add(move.current)
    controls.target.add(move.current)
    invalidate() // keep rendering while a pan key is held
  })

  return null
}
