import { useCallback, useLayoutEffect, useReducer, useRef, useState, type ReactNode } from "react"
import { useThree } from "@react-three/fiber"
import { Matrix4, type BufferGeometry, type Group, type Material, type Mesh } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { markShadowsDirty } from "../scene/shadows"
import { BATCH_PART, BatchContext, materialKey } from "./batching"

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
 * ONE mesh per material look across the whole office (~900 draws → ~160) and
 * hides theirs.
 *
 * Only for what never changes on its own while viewing: doors, windows and
 * wall items fade with the wall cutaway, so they stay out (the renderer
 * decides, per piece). Rebuilt in the same commit whenever any piece re-bakes
 * (a chair pulled out on another day, a layout change), so it never shows
 * stale furniture.
 */
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
      const key = `${materialKey(material)}|${material.opacity}|${m.castShadow}|${m.receiveShadow}`
      groups.set(key, [...(groups.get(key) ?? []), m])
    }
    const next: Part[] = []
    for (const [key, meshes] of groups) {
      const geometries = meshes.map((m) =>
        m.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, m.matrixWorld))
      )
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((x) => x.dispose())
      if (!merged) continue // couldn't merge: those keep drawing themselves
      meshes.forEach((m) => (m.visible = false))
      hidden.current.push(...meshes)
      next.push({
        key,
        geometry: merged,
        material: meshes[0].material as Material,
        castShadow: meshes[0].castShadow,
        receiveShadow: meshes[0].receiveShadow,
      })
    }
    setParts(next)
  }, [enabled, version])

  // New batch → the cached shadow maps must include it; free the old one.
  useLayoutEffect(() => {
    markShadowsDirty(gl, invalidate)
    return () => parts.forEach((p) => p.geometry.dispose())
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
