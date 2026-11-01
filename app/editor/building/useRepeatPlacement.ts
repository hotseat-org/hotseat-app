import { useMemo, useState } from "react"
import { composeRepeat, furnitureCollides } from "../layout"
import { useCollidables, useEditorStore } from "../store"
import { isWallMounted, type Cell, type ObjectType, type SceneObject, type Tool } from "../types"

export type RepeatDrag = { start: Cell & { rotation?: number }; end: Cell }

/**
 * Row / Pod placement: where the drag began and where it is now, the copies it
 * would lay, and which of them are blocked (as addObjects would decide:
 * against the office and the copies before it). Wall items hang one at a time.
 */
export const useRepeatPlacement = (tool: Tool, isFurniture: boolean) => {
  // What a row mustn't run into: the floor's pieces and what other floors keep clear.
  const objects = useCollidables()
  const placementPattern = useEditorStore((state) => state.placementPattern)
  const placementRotation = useEditorStore((state) => state.placementRotation)
  const [repeat, setRepeat] = useState<RepeatDrag | null>(null)
  const isRepeating =
    isFurniture && placementPattern !== "single" && !isWallMounted(tool as ObjectType)
  const repeatPlan = useMemo(() => {
    if (!repeat || placementPattern === "single") return []

    return composeRepeat(
      { type: tool as ObjectType, rotation: repeat.start.rotation ?? placementRotation },
      repeat,
      placementPattern
    )
  }, [repeat, placementPattern, tool, placementRotation])
  const repeatBlocked = useMemo(() => {
    const placed: SceneObject[] = []

    return repeatPlan.map((point) => {
      const isBlocked = furnitureCollides([...objects, ...placed], {
        type: tool as ObjectType,
        ...point,
      })
      if (!isBlocked)
        placed.push({ id: `plan-${placed.length}`, type: tool as ObjectType, ...point })

      return isBlocked
    })
  }, [repeatPlan, objects, tool])

  return { repeat, setRepeat, isRepeating, repeatPlan, repeatBlocked }
}
