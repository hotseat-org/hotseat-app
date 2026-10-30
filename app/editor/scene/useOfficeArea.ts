import { useMemo } from "react"
import type { SceneObject } from "../types"

/**
 * Where the office stands and how far it reaches from there (both to whole
 * metres, so small edits don't refit): the sun and its shadows aim there.
 */
export const useOfficeArea = (objects: SceneObject[]) =>
  useMemo((): { centre: [number, number]; reach: number } => {
    if (!objects.length) return { centre: [0, 0], reach: 0 }

    let minX = Infinity
    let minZ = Infinity
    let maxX = -Infinity
    let maxZ = -Infinity
    for (const object of objects) {
      minX = Math.min(minX, object.x)
      minZ = Math.min(minZ, object.z)
      maxX = Math.max(maxX, object.x)
      maxZ = Math.max(maxZ, object.z)
    }

    return {
      centre: [Math.round((minX + maxX) / 2), Math.round((minZ + maxZ) / 2)],
      reach: Math.ceil(Math.hypot(maxX - minX, maxZ - minZ) / 2),
    }
  }, [objects])
