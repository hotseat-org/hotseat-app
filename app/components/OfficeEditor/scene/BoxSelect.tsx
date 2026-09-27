import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import { Vector3 } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { isEdgeType, isMarker } from "../types"

/** Pixels the pointer must travel before a floor press becomes a box drag. */
const THRESHOLD = 4

/**
 * Box select: a press on empty floor (Select tool) starts `store.box`; this
 * tracks the drag on the window and, on release, selects every piece of
 * furniture whose centre projects inside the box (Shift adds to the current
 * selection). A press that never moves is just a click (deselect).
 */
export const BoxSelect = () => {
  const active = useEditorStore((s) => s.box !== null)
  const store = useEditorStoreApi()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    if (!active) return
    const move = (e: PointerEvent) => {
      const box = store.getState().box
      if (box) store.getState().setBox({ ...box, x1: e.clientX, y1: e.clientY })
    }
    const up = () => {
      const s = store.getState()
      const box = s.box
      s.setBox(null)
      if (!box) return
      const dragged = Math.abs(box.x1 - box.x0) > THRESHOLD || Math.abs(box.y1 - box.y0) > THRESHOLD
      if (!dragged) return
      const rect = gl.domElement.getBoundingClientRect()
      const [minX, maxX] = [Math.min(box.x0, box.x1), Math.max(box.x0, box.x1)]
      const [minY, maxY] = [Math.min(box.y0, box.y1), Math.max(box.y0, box.y1)]
      const v = new Vector3()
      const hits = s.objects
        .filter((o) => !isEdgeType(o.type) && !isMarker(o.type))
        .filter((o) => {
          v.set(o.x, 0.4, o.z).project(camera)
          const sx = rect.left + ((v.x + 1) / 2) * rect.width
          const sy = rect.top + ((1 - v.y) / 2) * rect.height
          return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY
        })
        .map((o) => o.id)
      const ids = box.additive ? [...new Set([...s.selection, ...hits])] : hits
      s.selectMany(ids)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [active, store, camera, gl])

  return null
}
