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
import { markShadowsDirty } from "../scene/shadows"
import { MERGED_KIND, setCutAttributes } from "../scene/cutaway"
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
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3)
  geometry.setAttribute("color", new BufferAttribute(colors, 3))
  return geometry
}

export const StaticBatch = ({ enabled, children }: { enabled: boolean; children: ReactNode }) => {
  const root = useRef<Group>(null)
  const output = useRef<Group>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [version, handleChanged] = useReducer((n: number) => n + 1, 0)
  const notify = useCallback(() => handleChanged(), [])
  // What we hid: shown again before each rebuild (and when editing starts —
  // by then the pieces have already dropped their batch mark).
  const hidden = useRef<Mesh[]>([])
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    const g = root.current
    if (!g) return
    const sources: Mesh[] = []
    g.traverse((o) => {
      if ((o as Mesh).isMesh && o.userData[BATCH_PART]) sources.push(o as Mesh)
    })
    for (const m of hidden.current) m.visible = true
    hidden.current = []
    if (!enabled) {
      setParts([]) // editing: every piece draws its own meshes again
      return
    }
    g.updateWorldMatrix(true, true)
    const inverse = new Matrix4().copy(g.matrixWorld).invert()
    const groups = new Map<string, Mesh[]>()
    for (const m of sources) {
      // Opacity too: unlike within one piece, two pieces' glass can differ.
      const material = m.material as Material
      const key = `${surfaceKey(material)}|${material.opacity}|${m.castShadow}|${m.receiveShadow}|${cutawayOf(material) ?? ""}`
      groups.set(key, [...(groups.get(key) ?? []), m])
    }
    const next: Part[] = []
    for (const [key, meshes] of groups) {
      const cutaway = cutawayOf(meshes[0].material as Material)
      const geometries = meshes.map((m) => {
        const toBatch = new Matrix4().multiplyMatrices(inverse, m.matrixWorld)
        const geometry = withColor(
          m.geometry.clone().applyMatrix4(toBatch),
          (m.material as Material & { color: Color }).color
        )
        if (!cutaway) return geometry
        // Cut by the wall cutaway: each vertex keeps its piece's anchor (its
        // origin) and the way it runs (its local X), as its own mesh gave them.
        const e = toBatch.elements
        const axis = Math.abs(e[0]) >= Math.abs(e[2]) ? 0 : 1
        return setCutAttributes(geometry, new Vector3().setFromMatrixPosition(toBatch), axis)
      })
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((x) => x.dispose())
      if (!merged) continue // couldn't merge: those keep drawing themselves
      meshes.forEach((m) => (m.visible = false))
      hidden.current.push(...meshes)
      // The look of the first, in white: the colours come from the vertices.
      const material = (meshes[0].material as Material & { color: Color }).clone()
      material.color.set(0xffffff)
      material.vertexColors = true
      // A clone loses its shader patch: the shading, and the cutaway's merged variant.
      if (material.type === "MeshStandardMaterial")
        Object.assign(material, getSurfaceShader(cutaway ? MERGED_KIND[cutaway] : null))
      next.push({
        key,
        geometry: merged,
        material,
        castShadow: meshes[0].castShadow,
        receiveShadow: meshes[0].receiveShadow,
      })
    }
    setParts(next)
  }, [enabled, version])

  // New batch → the cached shadow maps must include it; free the old one.
  useLayoutEffect(() => {
    markShadowsDirty(gl, invalidate)
    return () =>
      parts.forEach((p) => {
        p.geometry.dispose()
        p.material.dispose()
      })
  }, [parts, gl, invalidate])

  return (
    <BatchContext.Provider value={enabled ? notify : null}>
      <group ref={root}>{children}</group>
      <group ref={output}>
        {parts.map((p) => (
          <mesh
            key={p.key + p.geometry.uuid}
            geometry={p.geometry}
            material={p.material}
            castShadow={p.castShadow}
            receiveShadow={p.receiveShadow}
            raycast={() => null}
          />
        ))}
      </group>
    </BatchContext.Provider>
  )
}
