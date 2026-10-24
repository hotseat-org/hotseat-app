import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useThree } from "@react-three/fiber"
import { BufferGeometry, Matrix4, Mesh, type Group, type Material, type Object3D } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { markShadowsDirty } from "../scene/shadows"
import { BATCH_PART, materialKey, useBatchChanged, type AnyMaterial } from "./batching"

/** Mark a subtree (e.g. an animated model) to be left out of baking. */
export const NO_BAKE = { noBake: true }

interface Part {
  key: string
  geometry: BufferGeometry
  material: Material
  castShadow: boolean
  receiveShadow: boolean
}

const noRaycast = () => {}
const meshRaycast = Mesh.prototype.raycast

/** Stop (or restart) three.js recomputing a mesh's matrices every frame. */
const freeze = (m: Mesh) => {
  m.matrixAutoUpdate = false
  m.matrixWorldAutoUpdate = false
}
const thaw = (m: Mesh) => {
  m.matrixAutoUpdate = true
  m.matrixWorldAutoUpdate = true
}

/** An original merged into the baked meshes: hidden, not hit, frozen — or back to normal. */
const setOriginal = (m: Mesh, isMerged: boolean) => {
  m.visible = !isMerged
  m.raycast = isMerged ? noRaycast : meshRaycast
  if (isMerged) freeze(m)
  else thaw(m)
}

/** The meshes to bake (skipping NO_BAKE subtrees and our own merged output). */
const collect = (root: Object3D, skip: Object3D | null): Mesh[] => {
  const out: Mesh[] = []
  const walk = (o: Object3D) => {
    if (o === skip || o.userData.noBake) return
    if ((o as Mesh).isMesh && !Array.isArray((o as Mesh).material)) out.push(o as Mesh)
    for (const c of o.children) walk(c)
  }
  for (const c of root.children) walk(c)
  return out
}

/**
 * Draw-call batching for one piece of furniture: its many small meshes are
 * merged into ONE mesh per distinct material look (a chair's 11 meshes → 3), and
 * the originals are hidden.
 *
 * The originals stay mounted, so everything keyed to them keeps working:
 * recolouring swaps their materials (→ re-bake), and the carry animation moves
 * an ancestor group. Re-baking only happens when a cheap fingerprint of the
 * parts actually changes.
 *
 * Between bakes the originals are inert: pointer events hit the merged meshes
 * instead (the same triangles, in far fewer meshes), and their matrices are
 * frozen — three.js would otherwise recompute every hidden part's matrices
 * every frame (thousands of them across an office).
 */
export const Baked = ({
  children,
  isBatchable = false,
}: {
  children: ReactNode
  /** May join the office-wide batch (see StaticBatch): it never changes on its own. */
  isBatchable?: boolean
}) => {
  const root = useRef<Group>(null)
  const output = useRef<Group>(null)
  const [parts, setParts] = useState<Part[]>([])
  const fingerprint = useRef("")
  // Shadows depend on shape, not material: only a geometry/transform change
  // needs the (cached) shadow maps redrawn — not the door/window cutaway
  // swapping materials, which happens constantly while hovering walls.
  const shapeFingerprint = useRef("")
  const shapeChanged = useRef(false)
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const handleBatchChanged = useBatchChanged()
  const shouldBatch = isBatchable && !!handleBatchChanged

  useLayoutEffect(() => {
    const g = root.current
    if (!g) return
    const meshes = collect(g, output.current)
    const fp = meshes
      .map(
        (m) =>
          // Material look included: recolouring mutates a material in place.
          `${m.geometry.uuid}:${(m.material as Material).uuid}:${materialKey(m.material as AnyMaterial)}:${m.position.toArray()}:${m.rotation.toArray()}:${m.scale.toArray()}`
      )
      .join(";")
    // Hide and freeze originals every time (newly mounted ones included); cheap.
    for (const m of meshes) setOriginal(m, true)
    if (fp === fingerprint.current) return
    fingerprint.current = fp
    const shape = meshes
      .map(
        (m) =>
          `${m.geometry.uuid}:${m.position.toArray()}:${m.rotation.toArray()}:${m.scale.toArray()}:${m.castShadow}`
      )
      .join(";")
    if (shape !== shapeFingerprint.current) {
      shapeFingerprint.current = shape
      shapeChanged.current = true
    }

    // Fresh matrices for the merge (frozen again below).
    for (const m of meshes) thaw(m)
    g.updateWorldMatrix(true, true)
    for (const m of meshes) freeze(m)
    const inv = new Matrix4().copy(g.matrixWorld).invert()
    const groups = new Map<string, { meshes: Mesh[]; material: Material }>()
    for (const m of meshes) {
      const mat = m.material as AnyMaterial
      const key = `${materialKey(mat)}|${m.castShadow}|${m.receiveShadow}`
      const grp = groups.get(key)
      if (grp) grp.meshes.push(m)
      else groups.set(key, { meshes: [m], material: mat })
    }

    const next: Part[] = []
    for (const [key, { meshes: ms, material }] of groups) {
      const geoms = ms.map((m) => {
        const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
        // Keep only what our (texture-less) materials use, so attributes match.
        const geo = new BufferGeometry()
        geo.setAttribute("position", src.getAttribute("position"))
        if (src.getAttribute("normal")) geo.setAttribute("normal", src.getAttribute("normal"))
        else geo.computeVertexNormals()
        src.dispose()
        return geo.applyMatrix4(new Matrix4().multiplyMatrices(inv, m.matrixWorld))
      })
      const merged = mergeGeometries(geoms, false)
      geoms.forEach((x) => x.dispose())
      if (!merged) {
        ms.forEach((m) => setOriginal(m, false)) // couldn't merge: leave them as-is
        continue
      }
      next.push({
        key,
        geometry: merged,
        material,
        castShadow: ms[0].castShadow,
        receiveShadow: ms[0].receiveShadow,
      })
    }
    setParts(next)
  })

  // New shapes → the cached shadow maps must include them; free old geometry.
  useLayoutEffect(() => {
    if (shapeChanged.current) {
      shapeChanged.current = false
      markShadowsDirty(gl, invalidate)
    } else invalidate()
    // Only a piece in the office-wide batch changes it: doors and windows
    // re-bake all the time in the wall cutaway, and each call re-merges the
    // whole office.
    if (shouldBatch) handleBatchChanged?.()
    return () => parts.forEach((p) => p.geometry.dispose())
  }, [parts, gl, invalidate, handleBatchChanged, shouldBatch])

  return (
    <group ref={root}>
      {children}
      <group ref={output}>
        {parts.map((p) => (
          <mesh
            key={p.key + p.geometry.uuid}
            geometry={p.geometry}
            material={p.material}
            castShadow={p.castShadow}
            receiveShadow={p.receiveShadow}
            userData={shouldBatch ? { [BATCH_PART]: true } : {}}
          />
        ))}
      </group>
    </group>
  )
}
