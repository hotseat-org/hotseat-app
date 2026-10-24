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
 * How a material LOOKS — materials that render identically share a batch. Not
 * opacity: the wall/door cutaway animates it per frame on the material itself.
 */
export const materialKey = (m: AnyMaterial) =>
  [
    m.type,
    m.color?.getHexString(),
    m.roughness,
    m.metalness,
    m.emissive?.getHexString(),
    m.emissiveIntensity,
    m.flatShading,
    m.transparent,
    m.depthWrite,
    m.side,
    m.clippingPlanes?.length ?? 0,
  ].join("|")

/** Marks a Baked output mesh that may join the office-wide batch (see StaticBatch). */
export const BATCH_PART = "batchPart"

/** Set inside an enabled StaticBatch: a Baked piece calls it after (re)baking. */
export const BatchContext = createContext<(() => void) | null>(null)
export const useBatchChanged = () => useContext(BatchContext)
