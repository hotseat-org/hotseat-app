import { createContext, useContext } from "react"
import type { Material } from "three"

export type AnyMaterial = Material & {
  color?: { getHexString(): string }
  emissive?: { getHexString(): string }
  roughness?: number
  metalness?: number
  emissiveIntensity?: number
  flatShading?: boolean
  clippingPlanes?: unknown[] | null
}

/**
 * How a material LOOKS — materials that render identically share a batch.
 * Not opacity: StaticBatch adds it (two pieces' glass can differ).
 */
export const materialKey = (material: AnyMaterial) =>
  `${material.color?.getHexString()}|${surfaceKey(material)}`

/**
 * How a material looks apart from its colour: surfaces that differ only in
 * colour can share one mesh, their colours carried per vertex (see StaticBatch).
 */
export const surfaceKey = (material: AnyMaterial) =>
  [
    material.type,
    material.roughness,
    material.metalness,
    material.emissive?.getHexString(),
    material.emissiveIntensity,
    material.flatShading,
    material.transparent,
    material.depthWrite,
    material.side,
    material.clippingPlanes?.length ?? 0,
  ].join("|")

/** Marks a Baked output mesh that may join the office-wide batch (see StaticBatch). */
export const BATCH_PART = "batchPart"

/** Set inside an enabled StaticBatch: a Baked piece calls it after (re)baking. */
export const BatchContext = createContext<(() => void) | null>(null)
export const useBatchChanged = () => useContext(BatchContext)
