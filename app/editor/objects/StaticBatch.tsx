import { useCallback, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react"
import { useThree } from "@react-three/fiber"
import {
  BufferAttribute,
  Matrix4,
  Vector3,
  type BufferGeometry,
  type Color,
  type Group,
  type Material,
  type Mesh,
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { markShadowsDirty } from "../lighting/shadows"
import { MERGED_KIND, cutDirectionOf, setCutAttributes } from "../walls/cutaway"
import { useFloorPlace } from "./floorHeight"
import { getSurfaceShader } from "./surfaceShader"
import { BATCH_PART, BatchContext, surfaceKey } from "./batching"

interface Part {
  key: string
  geometry: BufferGeometry
  material: Material
  castShadow: boolean
  receiveShadow: boolean
}

/**
 * Office-wide draw-call batching (view mode). Each piece of furniture already
 * merges its own meshes (see Baked) — but a big office still has hundreds of
 * pieces, each drawn separately. This merges every piece's baked meshes into
 * ONE mesh per kind of surface across the whole office and hides theirs.
 * Colour isn't a kind: it's carried per vertex, so a red chair and a blue one
 * share a mesh (and a draw call).
 *
 * Doors, windows and wall items join too: the wall cutaway slices them in its
 * shader, reading each one's anchor from its vertices (see cutaway.ts). Rebuilt in the same commit whenever any piece re-bakes
 * (a chair pulled out on another day, a layout change), so it never shows
 * stale furniture.
 */
/** The cutaway a material is sliced by, if any (marked by Surface). */
const cutawayOf = (material: Material) =>
  material.userData.cutaway as keyof typeof MERGED_KIND | undefined

/** The geometry with every vertex in one colour (linear, as the material holds it). */
const withColor = (geometry: BufferGeometry, color: Color) => {
  const count = geometry.getAttribute("position").count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i += 3) {
    colors[i] = color.r
    colors[i + 1] = color.g
    colors[i + 2] = color.b
  }
  geometry.setAttribute("color", new BufferAttribute(colors, 3))

  return geometry
}

export const StaticBatch = ({ enabled, children }: { enabled: boolean; children: ReactNode }) => {
  const root = useRef<Group>(null)
  const output = useRef<Group>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [version, handleChanged] = useReducer((count: number) => count + 1, 0)
  const notify = useCallback(() => handleChanged(), [])
  // What we hid: shown again before each rebuild (and when editing starts —
  // by then the pieces have already dropped their batch mark).
  const hidden = useRef<Mesh[]>([])
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const floorPlace = useFloorPlace()

  useLayoutEffect(() => {
    const group = root.current
    if (!group) return

    const sources: Mesh[] = []
    group.traverse((object) => {
      if ((object as Mesh).isMesh && object.userData[BATCH_PART]) sources.push(object as Mesh)
    })
    for (const mesh of hidden.current) mesh.visible = true
    hidden.current = []
    if (!enabled) {
      setParts([]) // editing: every piece draws its own meshes again

      return
    }

    group.updateWorldMatrix(true, true)
    const inverse = new Matrix4().copy(group.matrixWorld).invert()
    const groups = new Map<string, Mesh[]>()
    for (const mesh of sources) {
      // Opacity too: unlike within one piece, two pieces' glass can differ.
      const material = mesh.material as Material
      const key = `${surfaceKey(material)}|${material.opacity}|${mesh.castShadow}|${mesh.receiveShadow}|${cutawayOf(material) ?? ""}`
      groups.set(key, [...(groups.get(key) ?? []), mesh])
    }
    const next: Part[] = []
    for (const [key, meshes] of groups) {
      const cutaway = cutawayOf(meshes[0].material as Material)
      const geometries = meshes.map((mesh) => {
        const toBatch = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)
        const geometry = withColor(
          mesh.geometry.clone().applyMatrix4(toBatch),
          (mesh.material as Material & { color: Color }).color
        )
        if (!cutaway) return geometry

        // Cut by the wall cutaway: each vertex keeps its piece's anchor (its
        // origin) and the way it runs (its local X), as its own mesh gave them.
        const elements = toBatch.elements
        const axis = cutDirectionOf(elements[0], elements[2])

        return setCutAttributes(geometry, new Vector3().setFromMatrixPosition(toBatch), axis)
      })
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((x) => x.dispose())
      if (!merged) continue // couldn't merge: those keep drawing themselves

      meshes.forEach((mesh) => (mesh.visible = false))
      hidden.current.push(...meshes)
      // The look of the first, in white: the colours come from the vertices.
      const material = (meshes[0].material as Material & { color: Color }).clone()
      material.color.set(0xffffff)
      material.vertexColors = true
      // A clone loses its shader patch: the shading, and the cutaway's merged variant.
      if (material.type === "MeshStandardMaterial")
        Object.assign(material, getSurfaceShader(cutaway ? MERGED_KIND[cutaway] : null, floorPlace))

      next.push({
        key,
        geometry: merged,
        material,
        castShadow: meshes[0].castShadow,
        receiveShadow: meshes[0].receiveShadow,
      })
    }
    setParts(next)
  }, [enabled, version, floorPlace])

  // New batch → the cached shadow maps must include it; free the old one's
  // geometry. Not its materials: three.js would free their shader programs,
  // and the next batch (another floor shown and back) compile them all again.
  useLayoutEffect(() => {
    markShadowsDirty(invalidate)

    return () => parts.forEach((part) => part.geometry.dispose())
  }, [parts, renderer, invalidate])

  return (
    <BatchContext.Provider value={enabled ? notify : null}>
      <group ref={root}>{children}</group>
      <group ref={output}>
        {parts.map((part) => (
          <mesh
            key={part.key + part.geometry.uuid}
            geometry={part.geometry}
            material={part.material}
            castShadow={part.castShadow}
            receiveShadow={part.receiveShadow}
            raycast={() => null}
          />
        ))}
      </group>
    </BatchContext.Provider>
  )
}
