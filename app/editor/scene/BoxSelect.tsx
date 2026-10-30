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
  const active = useEditorStore((state) => state.box !== null)
  const store = useEditorStoreApi()
  const camera = useThree((state) => state.camera)
  const renderer = useThree((state) => state.gl)

  useEffect(() => {
    if (!active) return

    const move = (event: PointerEvent) => {
      const box = store.getState().box
      if (box) store.getState().setBox({ ...box, endX: event.clientX, endY: event.clientY })
    }
    const up = () => {
      const state = store.getState()
      const box = state.box
      state.setBox(null)
      if (!box) return

      const dragged =
        Math.abs(box.endX - box.startX) > THRESHOLD || Math.abs(box.endY - box.startY) > THRESHOLD
      if (!dragged) return

      const rect = renderer.domElement.getBoundingClientRect()
      const [minX, maxX] = [Math.min(box.startX, box.endX), Math.max(box.startX, box.endX)]
      const [minY, maxY] = [Math.min(box.startY, box.endY), Math.max(box.startY, box.endY)]
      const vector = new Vector3()
      const hits = state.objects
        .filter((object) => !isEdgeType(object.type) && !isMarker(object.type))
        .filter((object) => {
          vector.set(object.x, 0.4, object.z).project(camera)
          const screenX = rect.left + ((vector.x + 1) / 2) * rect.width
          const screenY = rect.top + ((1 - vector.y) / 2) * rect.height

          return screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY
        })
        .map((object) => object.id)
      const ids = box.additive ? [...new Set([...state.selection, ...hits])] : hits
      state.selectMany(ids)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)

    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
    }
  }, [active, store, camera, renderer])

  return null
}
