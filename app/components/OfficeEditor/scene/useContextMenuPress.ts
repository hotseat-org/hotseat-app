import { useCallback, useEffect, useRef } from "react"
import type { ThreeEvent } from "@react-three/fiber"
import { useEditorStoreApi } from "../store"
import type { Cell } from "../types"

/** A right-press that moves more than this (px) orbits: no menu. */
const MENU_SLOP = 6

/**
 * The right-click menu. A right-drag orbits the camera, so the menu opens on
 * the release, only when the pointer barely moved — and a press on a piece the
 * selection doesn't hold selects it first. `pressMenu` notes a press on the
 * floor (no piece); `onMenuPress`, on a piece.
 */
export const useContextMenuPress = (readOnly: boolean) => {
  const storeApi = useEditorStoreApi()
  const menuPress = useRef<{ targetId: string | null; point: Cell; x: number; y: number } | null>(
    null
  )
  const pressMenu = useCallback((targetId: string | null, point: Cell, e: PointerEvent) => {
    menuPress.current = { targetId, point, x: e.clientX, y: e.clientY }
  }, [])
  const onMenuPress = useCallback(
    (id: string, e: ThreeEvent<PointerEvent>) =>
      pressMenu(id, { x: e.point.x, z: e.point.z }, e.nativeEvent),
    [pressMenu]
  )
  useEffect(() => {
    if (readOnly) return
    const handleMove = (e: PointerEvent) => {
      const press = menuPress.current
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > MENU_SLOP)
        menuPress.current = null
    }
    const handleUp = (e: PointerEvent) => {
      const press = menuPress.current
      menuPress.current = null
      if (!press || e.button !== 2) return
      const s = storeApi.getState()
      if (press.targetId && !s.selection.includes(press.targetId)) {
        s.setTool("select")
        s.select(press.targetId)
      }
      s.openContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetId: press.targetId,
        point: press.point,
      })
    }
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
    }
  }, [readOnly, storeApi])
  return { pressMenu, onMenuPress }
}
