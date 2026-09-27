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
  const camera = useThree((s) => s.camera)
  const store = useEditorStoreApi()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key]
      if (!dir || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      if (store.getState().selection.length === 0) return
      e.preventDefault()
      // Camera-relative forward/right, flattened and snapped to a world axis.
      const f = camera.getWorldDirection(new Vector3()).setY(0).normalize()
      const r = new Vector3().crossVectors(f, new Vector3(0, 1, 0)).normalize()
      const m = f.multiplyScalar(dir[1]).add(r.multiplyScalar(dir[0]))
      const step = GRID * (e.shiftKey ? 2 : 1)
      const [dx, dz] =
        Math.abs(m.x) >= Math.abs(m.z) ? [Math.sign(m.x) * step, 0] : [0, Math.sign(m.z) * step]
      store.getState().nudgeSelection(dx, dz)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [camera, store])

  return null
}
