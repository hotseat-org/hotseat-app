import { createContext, useContext } from "react"
import type { Material, Object3D } from "three"

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

const skipUpdate = () => {}

/**
 * Whether three works out a mesh's world matrix at every frame — it goes into
 * every part of a piece, as the piece's own is worked out. Merged away (into
 * its piece's bake, or the office-wide batch), a mesh is hidden: nothing needs
 * it then, and what measures it works it out first (updateWorldMatrix).
 */
export const setWorldMatrixKept = (mesh: Object3D, isKept: boolean) => {
  if (isKept)
    Reflect.deleteProperty(mesh, "updateMatrixWorld") // three's own again
  else mesh.updateMatrixWorld = skipUpdate
}

/** Whether three works out an object's world matrix at every frame (see setWorldMatrixKept). */
export const isWorldMatrixKept = (object: Object3D) =>
  !Object.prototype.hasOwnProperty.call(object, "updateMatrixWorld")
