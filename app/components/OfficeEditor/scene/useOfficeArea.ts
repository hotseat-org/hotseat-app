import { useMemo } from "react"
import type { SceneObject } from "../types"

/**
 * Where the office stands and how far it reaches from there (both to whole
 * metres, so small edits don't refit): the sun and its shadows aim there.
 */
export const useOfficeArea = (objects: SceneObject[]) =>
  useMemo((): { centre: [number, number]; reach: number } => {
    if (!objects.length) return { centre: [0, 0], reach: 0 }
    let x0 = Infinity
    let z0 = Infinity
    let x1 = -Infinity
    let z1 = -Infinity
    for (const o of objects) {
      x0 = Math.min(x0, o.x)
      z0 = Math.min(z0, o.z)
      x1 = Math.max(x1, o.x)
      z1 = Math.max(z1, o.z)
    }
    return {
      centre: [Math.round((x0 + x1) / 2), Math.round((z0 + z1) / 2)],
      reach: Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 2),
    }
  }, [objects])
