import { useThree } from "@react-three/fiber"
import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import { Plane, Vector2, Vector3 } from "three"
import type { CursorHint } from "../cursors"
import { SEG, edgeDirection } from "../layout"
import { useEditorStoreApi } from "../store"
import type { Cell, SceneObject } from "../types"
import { composeWallShift, findWallGrip } from "../wallShift"

const GROUND = new Plane(new Vector3(0, 1, 0), 0)
/** The cursor hint's id (one at a time: the wall under the cursor). */
const HINT_ID = "wall-resize"

export interface WallResizeHandle {
  /** Select tool, pointer over the floor: the resize cursor near a wall's foot. */
  hover: (x: number, z: number) => void
  /** A press on the floor: true if it grabbed a wall (the drag is then ours). */
  press: (x: number, z: number) => boolean
}

interface Props {
  ref: Ref<WallResizeHandle>
  setCursorHint: (id: string, hint: CursorHint | null) => void
}

/**
 * Dragging a wall sideways with the Select tool — grab it by its foot, where
 * it meets the floor. Its straight run moves a grid step at a time, the walls
 * at its ends stretch or shrink to keep the room closed (see wallShift.ts),
 * and a step that can't be made (another wall, furniture) is skipped. The
 * whole drag is one undo step; Esc puts it back.
 */
export const WallResize = ({ ref, setCursorHint }: Props) => {
  const store = useEditorStoreApi()
  const camera = useThree((state) => state.camera)
  const raycaster = useThree((state) => state.raycaster)
  const renderer = useThree((state) => state.gl)
  const hovered = useRef<string | null>(null)
  const cancel = useRef<(() => void) | null>(null)
  useEffect(() => () => cancel.current?.(), [])

  /** The floor point under a screen point. */
  const groundAt = (clientX: number, clientY: number): Cell | null => {
    const rect = renderer.domElement.getBoundingClientRect()
    const pointer = new Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.ray.intersectPlane(GROUND, new Vector3())

    return hit ? { x: hit.x, z: hit.z } : null
  }

  /** The double arrow across the wall, as the camera sees it (to 45°). */
  const hintFor = (wall: SceneObject): CursorHint => {
    const across = edgeDirection(wall.rotation) === "x" ? [0, 1] : [1, 0]
    const centrePoint = new Vector3(wall.x, 0, wall.z).project(camera)
    const acrossPoint = new Vector3(wall.x + across[0], 0, wall.z + across[1]).project(camera)
    const degrees =
      (Math.atan2(-(acrossPoint.y - centrePoint.y), acrossPoint.x - centrePoint.x) * 180) / Math.PI
    const step = (((Math.round(degrees / 45) * 45) % 180) + 180) % 180

    return `resize${step}` as CursorHint
  }

  useImperativeHandle(ref, () => ({
    hover: (x, z) => {
      if (cancel.current) return

      const { objects, tool, armedKit } = store.getState()
      const id = tool === "select" && !armedKit ? findWallGrip(objects, x, z) : null
      if (id === hovered.current) return

      hovered.current = id
      const wall = id ? objects.find((object) => object.id === id) : undefined
      setCursorHint(HINT_ID, wall ? hintFor(wall) : null)
    },
    press: (x, z) => {
      const base = store.getState().objects
      const gripId = findWallGrip(base, x, z)
      const grip = gripId ? base.find((object) => object.id === gripId) : undefined
      if (!grip || !gripId) return false

      const across = edgeDirection(grip.rotation) === "x" ? "z" : "x"
      const start = across === "z" ? z : x
      let offset = 0
      store.getState().beginBatch()
      setCursorHint(HINT_ID, hintFor(grip))

      const handleMove = (event: PointerEvent) => {
        const point = groundAt(event.clientX, event.clientY)
        if (!point) return

        const next = Math.round((point[across] - start) / SEG) * SEG
        if (next === offset) return

        const shift = next === 0 ? { objects: base } : composeWallShift(base, gripId, next)
        if (!shift) return // can't go there: stays at the last step that could

        offset = next
        store.setState({ objects: shift.objects })
      }
      const finish = (isKept: boolean) => {
        window.removeEventListener("pointermove", handleMove)
        window.removeEventListener("pointerup", handleUp)
        window.removeEventListener("pointercancel", handleUp)
        window.removeEventListener("keydown", handleKey, true)
        cancel.current = null
        if (!isKept) store.setState({ objects: base })

        store.getState().endBatch()
        hovered.current = null
        setCursorHint(HINT_ID, null)
      }
      const handleUp = () => finish(true)
      const handleKey = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return

        event.stopPropagation() // not also "deselect, back to Select"
        finish(false)
      }
      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
      window.addEventListener("pointercancel", handleUp)
      window.addEventListener("keydown", handleKey, true)
      cancel.current = () => finish(false)

      return true
    },
  }))

  return null
}
