import { useMemo, useState } from "react"
import { composeRepeat, furnitureCollides } from "../layout"
import { useEditorStore } from "../store"
import { isWallMounted, type Cell, type ObjectType, type SceneObject, type Tool } from "../types"

export type RepeatDrag = { start: Cell & { rotation?: number }; end: Cell }

/**
 * Row / Pod placement: where the drag began and where it is now, the copies it
 * would lay, and which of them are blocked (as addObjects would decide:
 * against the office and the copies before it). Wall items hang one at a time.
 */
export const useRepeatPlacement = (tool: Tool, isFurniture: boolean) => {
  const objects = useEditorStore((state) => state.objects)
  const placementPattern = useEditorStore((state) => state.placementPattern)
  const placementRotation = useEditorStore((state) => state.placementRotation)
  const [repeat, setRepeat] = useState<RepeatDrag | null>(null)
  const isRepeating =
    isFurniture && placementPattern !== "single" && !isWallMounted(tool as ObjectType)
  const repeatPlan = useMemo(() => {
    if (!repeat || placementPattern === "single") return []

    return composeRepeat(
      tool as ObjectType,
      repeat.start.rotation ?? placementRotation,
      repeat.start,
      repeat.end,
      placementPattern
    )
  }, [repeat, placementPattern, tool, placementRotation])
  const repeatBlocked = useMemo(() => {
    const placed: SceneObject[] = []

    return repeatPlan.map((point) => {
      const isBlocked = furnitureCollides(
        [...objects, ...placed],
        tool as ObjectType,
        point.x,
        point.z,
        point.rotation
      )
      if (!isBlocked)
        placed.push({ id: `plan-${placed.length}`, type: tool as ObjectType, ...point })

      return isBlocked
    })
  }, [repeatPlan, objects, tool])

  return { repeat, setRepeat, isRepeating, repeatPlan, repeatBlocked }
}
