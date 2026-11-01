import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { useThree } from "@react-three/fiber"
import { BufferGeometry, Matrix4, Mesh, type Group, type Material, type Object3D } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { markShadowsDirty } from "../lighting/shadows"
import { BATCH_PART, materialKey, useBatchChanged, type AnyMaterial } from "./batching"

/** Mark a subtree (e.g. an animated model) to be left out of baking. */
export const NO_BAKE = { noBake: true }
/** Marks our merged output (to tell it from the originals it stands for). */
export const BAKED_OUTPUT = { isBakedOutput: true }

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
const freeze = (mesh: Mesh) => {
  mesh.matrixAutoUpdate = false
  mesh.matrixWorldAutoUpdate = false
}
const thaw = (mesh: Mesh) => {
  mesh.matrixAutoUpdate = true
  mesh.matrixWorldAutoUpdate = true
}

/** An original merged into the baked meshes: hidden, not hit, frozen — or back to normal. */
const setOriginal = (mesh: Mesh, isMerged: boolean) => {
  mesh.visible = !isMerged
  mesh.raycast = isMerged ? noRaycast : meshRaycast
  if (isMerged) freeze(mesh)
  else thaw(mesh)
}

/** The meshes to bake (skipping NO_BAKE subtrees and our own merged output). */
const collect = (root: Object3D, skip: Object3D | null): Mesh[] => {
  const collected: Mesh[] = []
  const walk = (object: Object3D) => {
    if (object === skip || object.userData.noBake) return
    if ((object as Mesh).isMesh && !Array.isArray((object as Mesh).material))
      collected.push(object as Mesh)

    for (const child of object.children) walk(child)
  }
  for (const child of root.children) walk(child)

  return collected
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
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const handleBatchChanged = useBatchChanged()
  const shouldBatch = isBatchable && !!handleBatchChanged

  useLayoutEffect(() => {
    const group = root.current
    if (!group) return

    const meshes = collect(group, output.current)
    const nextFingerprint = meshes
      .map(
        (mesh) =>
          // Material look included: recolouring mutates a material in place.
          `${mesh.geometry.uuid}:${(mesh.material as Material).uuid}:${materialKey(mesh.material as AnyMaterial)}:${mesh.position.toArray()}:${mesh.rotation.toArray()}:${mesh.scale.toArray()}`
      )
      .join(";")
    // Hide and freeze originals every time (newly mounted ones included); cheap.
    for (const mesh of meshes) setOriginal(mesh, true)
    if (nextFingerprint === fingerprint.current) return

    fingerprint.current = nextFingerprint
    const shape = meshes
      .map(
        (mesh) =>
          `${mesh.geometry.uuid}:${mesh.position.toArray()}:${mesh.rotation.toArray()}:${mesh.scale.toArray()}:${mesh.castShadow}`
      )
      .join(";")
    if (shape !== shapeFingerprint.current) {
      shapeFingerprint.current = shape
      shapeChanged.current = true
    }

    // Fresh matrices for the merge (frozen again below).
    for (const mesh of meshes) thaw(mesh)
    group.updateWorldMatrix(true, true)
    for (const mesh of meshes) freeze(mesh)
    const inverse = new Matrix4().copy(group.matrixWorld).invert()
    const groups = new Map<string, { meshes: Mesh[]; material: Material }>()
    for (const mesh of meshes) {
      const meshMaterial = mesh.material as AnyMaterial
      const key = `${materialKey(meshMaterial)}|${mesh.castShadow}|${mesh.receiveShadow}`
      const existing = groups.get(key)
      if (existing) existing.meshes.push(mesh)
      else groups.set(key, { meshes: [mesh], material: meshMaterial })
    }

    const next: Part[] = []
    for (const [key, { meshes: groupMeshes, material }] of groups) {
      const geoms = groupMeshes.map((mesh) => {
        const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
        // Keep only what our (texture-less) materials use, so attributes match.
        const geometry = new BufferGeometry()
        geometry.setAttribute("position", source.getAttribute("position"))
        if (source.getAttribute("normal"))
          geometry.setAttribute("normal", source.getAttribute("normal"))
        else geometry.computeVertexNormals()

        source.dispose()

        return geometry.applyMatrix4(new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
      })
      const merged = mergeGeometries(geoms, false)
      geoms.forEach((x) => x.dispose())
      if (!merged) {
        groupMeshes.forEach((mesh) => setOriginal(mesh, false)) // couldn't merge: leave them as-is
        continue
      }

      next.push({
        key,
        geometry: merged,
        material,
        castShadow: groupMeshes[0].castShadow,
        receiveShadow: groupMeshes[0].receiveShadow,
      })
    }
    setParts(next)
  })

  // New shapes → the cached shadow maps must include them; free old geometry.
  useLayoutEffect(() => {
    if (shapeChanged.current) {
      shapeChanged.current = false
      markShadowsDirty(renderer, invalidate)
    } else invalidate()
    // Only a piece in the office-wide batch changes it: doors and windows
    // re-bake all the time in the wall cutaway, and each call re-merges the
    // whole office.
    if (shouldBatch) handleBatchChanged?.()

    return () => parts.forEach((part) => part.geometry.dispose())
  }, [parts, renderer, invalidate, handleBatchChanged, shouldBatch])
  // Gone too: the batch drops it. (Another floor shown takes every piece away
  // at once — without this, the merged furniture stayed, drawn over it.)
  useLayoutEffect(
    () => () => {
      if (shouldBatch) handleBatchChanged?.()
    },
    [handleBatchChanged, shouldBatch]
  )

  return (
    <group ref={root}>
      {children}
      <group ref={output} userData={BAKED_OUTPUT}>
        {parts.map((part) => (
          <mesh
            key={part.key + part.geometry.uuid}
            geometry={part.geometry}
            material={part.material}
            castShadow={part.castShadow}
            receiveShadow={part.receiveShadow}
            userData={shouldBatch ? { [BATCH_PART]: true } : {}}
          />
        ))}
      </group>
    </group>
  )
}
