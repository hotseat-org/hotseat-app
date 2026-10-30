import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import { Vector3 } from "three"
import { useEditorStoreApi } from "../store"
import { GRID } from "../types"
import { isTypingTarget } from "../keyboard"

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

/**
 * Arrow keys nudge the selection by one grid square (Shift: two), relative to
 * the view — "up" moves away from the camera — snapped to the nearest world
 * axis. Refused moves (collisions, off the floor) simply don't happen.
 */
export const NudgeKeys = () => {
  const camera = useThree((state) => state.camera)
  const store = useEditorStoreApi()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const direction = KEYS[event.key]
      if (
        !direction ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      )
        return
      if (store.getState().selection.length === 0) return

      event.preventDefault()
      // Camera-relative forward/right, flattened and snapped to a world axis.
      const forward = camera.getWorldDirection(new Vector3()).setY(0).normalize()
      const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize()
      const movement = forward.multiplyScalar(direction[1]).add(right.multiplyScalar(direction[0]))
      const step = GRID * (event.shiftKey ? 2 : 1)
      const [deltaX, deltaZ] =
        Math.abs(movement.x) >= Math.abs(movement.z)
          ? [Math.sign(movement.x) * step, 0]
          : [0, Math.sign(movement.z) * step]
      store.getState().nudgeSelection(deltaX, deltaZ)
    }
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [camera, store])

  return null
}
