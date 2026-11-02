import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react"
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
  type MeshStandardMaterial,
} from "three"
import type { MeshStandardNodeMaterial } from "three/webgpu"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { markShadowsDirty } from "../lighting/shadows"
import { whenQuiet } from "../scene/whenQuiet"
import { MERGED_KIND, cutDirectionOf, setCutAttributes } from "../walls/cutaway"
import { useFloorPlace } from "./floorHeight"
import { copyAsNodeMaterial, getSurfaceShader } from "./surfaceShader"
import { BATCH_PART, BatchContext, materialKey, surfaceKey, type AnyMaterial } from "./batching"

/** The side of a cell (m) the office is merged in while editing. */
export const CELL_SIZE = 8
/** Cells merged at each quiet moment, in the background. */
const BACKGROUND_CELLS = 2

interface Part {
  key: string
  geometry: BufferGeometry
  material: Material
  castShadow: boolean
  receiveShadow: boolean
}

/** Never hit: the pieces it stands for are (their own hidden meshes). */
const ignoreRaycast = () => {}

/** One cell's merge: what it was made from, the meshes it hides, and its merged parts. */
interface Cell {
  signature: string
  meshes: Mesh[]
  parts: Part[]
}

/** A mesh to merge, placed in the batch's own space, and all its merge depends on. */
interface Source {
  mesh: Mesh
  toBatch: Matrix4
  signature: string
}

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

/** Which kind of surface a mesh joins: its look, opacity, shadows and cutaway. */
const getKindKey = (mesh: Mesh) => {
  // Opacity too: unlike within one piece, two pieces' glass can differ.
  const material = mesh.material as Material

  return `${surfaceKey(material)}|${material.opacity}|${mesh.castShadow}|${mesh.receiveShadow}|${cutawayOf(material) ?? ""}`
}

/** All a mesh's part in the merge depends on: its shape, its look and where it stands. */
const describe = (mesh: Mesh, toBatch: Matrix4) => {
  const material = mesh.material as AnyMaterial
  const placement = toBatch.elements.map((value) => value.toFixed(4)).join(",")

  return `${mesh.uuid}:${mesh.geometry.uuid}:${material.uuid}:${materialKey(material)}:${getKindKey(mesh)}:${placement}`
}

/** All a cell's merge depends on. */
const getSignature = (sources: Source[]) => sources.map((source) => source.signature).join(";")

/**
 * Each mesh's geometry as the merge takes it — placed, coloured, cut — kept
 * while the mesh is the same: a cell rebuilt for one piece that changed only
 * joins the others' again (most of a rebuild was preparing them).
 */
const preparedGeometries = new WeakMap<Mesh, { signature: string; geometry: BufferGeometry }>()

const getPrepared = ({ mesh, toBatch, signature }: Source) => {
  const known = preparedGeometries.get(mesh)
  if (known?.signature === signature) return known.geometry

  const copy = mesh.geometry.clone()
  // Not its bounds: placed, they'd be measured again (the merge measures its own).
  copy.boundingBox = null
  copy.boundingSphere = null
  const colored = withColor(
    copy.applyMatrix4(toBatch),
    (mesh.material as Material & { color: Color }).color
  )
  const cutaway = cutawayOf(mesh.material as Material)
  // Cut by the wall cutaway: each vertex keeps its piece's anchor (its
  // origin) and the way it runs (its local X), as its own mesh gave them.
  const elements = toBatch.elements
  const geometry = cutaway
    ? setCutAttributes(
        colored,
        new Vector3().setFromMatrixPosition(toBatch),
        cutDirectionOf(elements[0], elements[2])
      )
    : colored
  preparedGeometries.set(mesh, { signature, geometry })

  return geometry
}

/** Into a map of lists: onto the list at `key` (begun if there's none). */
const addTo = <Item,>(lists: Map<string, Item[]>, key: string, item: Item) => {
  const list = lists.get(key)
  if (list) list.push(item)
  else lists.set(key, [item])
}

/** The cell a mesh falls in, by where its piece stands — the one cell, without a size. */
const getCellKey = (toBatch: Matrix4, cellSize: number | undefined) => {
  if (!cellSize) return "all"

  const { elements } = toBatch

  return `${Math.floor(elements[12] / cellSize)},${Math.floor(elements[14] / cellSize)}`
}

/**
 * One cell's meshes merged: one mesh per kind of surface, their colours per
 * vertex. The merged meshes are hidden; one that can't merge keeps drawing itself.
 */
const mergeCell = (
  cellKey: string,
  sources: Source[],
  getMaterial: (kindKey: string, source: Material) => Material
): Part[] => {
  const kinds = new Map<string, Source[]>()
  for (const source of sources) {
    const kindKey = getKindKey(source.mesh)
    addTo(kinds, kindKey, source)
  }

  const parts: Part[] = []
  for (const [kindKey, kindSources] of kinds) {
    const firstMesh = kindSources[0].mesh
    const merged = mergeGeometries(kindSources.map(getPrepared), false)
    if (!merged) continue // couldn't merge: those keep drawing themselves

    kindSources.forEach(({ mesh }) => (mesh.visible = false))
    parts.push({
      key: `${cellKey}|${kindKey}`,
      geometry: merged,
      material: getMaterial(kindKey, firstMesh.material as Material),
      castShadow: firstMesh.castShadow,
      receiveShadow: firstMesh.receiveShadow,
    })
  }

  return parts
}

/**
 * Office-wide draw-call batching. Each piece of furniture already
 * merges its own meshes (see Baked) — but a big office still has hundreds of
 * pieces, each drawn separately. This merges every piece's baked meshes into
 * ONE mesh per kind of surface across the whole office and hides theirs.
 * Colour isn't a kind: it's carried per vertex, so a red chair and a blue one
 * share a mesh (and a draw call).
 *
 * Doors, windows and wall items join too: the wall cutaway slices them in its
 * shader, reading each one's anchor from its vertices (see cutaway.ts).
 * Rebuilt in the same commit whenever any piece re-bakes (a chair pulled out
 * on another day, a layout change), so it never shows stale furniture.
 *
 * Editing, the office is merged in cells (CELL_SIZE square): a change rebuilds
 * only its own cell, not the whole office (that took a fifth of a second). A
 * piece that's carried or turning is left out, drawn by itself, until it
 * stands still again (see ObjectRenderer).
 */
export const StaticBatch = ({
  cellSize,
  layout,
  isPaused = false,
  isInBackground = false,
  children,
}: {
  /** Not merged for now: a hidden floor still being drawn ahead (merged once it's all there). */
  isPaused?: boolean
  /**
   * Merged a few cells at a time, whenever the page is quiet (see whenQuiet):
   * a hidden floor drawn ahead, which mustn't stall the one in use.
   */
  isInBackground?: boolean
  /** Merged in cells this size (m), each rebuilt on its own; without one, as a whole. */
  cellSize?: number
  /** The pieces as they stand: when it changes, the cells whose pieces moved are rebuilt. */
  layout: unknown
  children: ReactNode
}) => {
  const root = useRef<Group>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [version, handleChanged] = useReducer((count: number) => count + 1, 0)
  const notify = useCallback(() => handleChanged(), [])
  const cells = useRef(new Map<string, Cell>())
  // One material per kind of surface, shared by every cell and kept across
  // rebuilds: a new material is a new shader for three to build.
  const materials = useRef(new Map<string, Material>())
  const builtPlace = useRef<unknown>(null)
  const renderer = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const floorPlace = useFloorPlace()

  const getMaterial = useCallback(
    (kindKey: string, source: Material) => {
      const known = materials.current.get(kindKey)
      if (known) return known

      // The look of the first, in white: the colours come from the vertices.
      const isSolid =
        (source as MeshStandardMaterial).isMeshStandardMaterial === true ||
        (source as MeshStandardNodeMaterial).isMeshStandardNodeMaterial === true
      const material = isSolid
        ? copyAsNodeMaterial(source)
        : (source.clone() as Material & { color: Color })
      material.color.set(0xffffff)
      material.vertexColors = true
      // Shaded like a Surface — with the cutaway's merged variant, when it's cut.
      const cutaway = cutawayOf(source)
      if (isSolid)
        Object.assign(material, getSurfaceShader(cutaway ? MERGED_KIND[cutaway] : null, floorPlace))

      materials.current.set(kindKey, material)

      return material
    },
    [floorPlace]
  )

  const cancelNextMerge = useRef(() => {})
  useLayoutEffect(() => {
    cancelNextMerge.current()
    const group = root.current
    if (!group || isPaused) return

    // Another floor: every cell anew, in that floor's materials. Not freed:
    // three.js would free their shader programs, and the next floor shown
    // (and back) would compile them all again.
    if (builtPlace.current !== floorPlace) {
      builtPlace.current = floorPlace
      materials.current = new Map()
      for (const cell of cells.current.values()) cell.signature = ""
    }

    // What's to merge now, cell by cell.
    group.updateWorldMatrix(true, true)
    const inverse = new Matrix4().copy(group.matrixWorld).invert()
    const found = new Map<string, Source[]>()
    group.traverse((object) => {
      if (!(object as Mesh).isMesh || !object.userData[BATCH_PART]) return

      const mesh = object as Mesh
      const toBatch = new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)
      const cellKey = getCellKey(toBatch, cellSize)
      const source = { mesh, toBatch, signature: describe(mesh, toBatch) }
      addTo(found, cellKey, source)
    })

    // The cells that changed (or are gone) show their meshes again…
    const signatures = new Map(
      [...found].map(([cellKey, sources]) => [cellKey, getSignature(sources)])
    )
    const staleKeys = [...cells.current.keys()].filter(
      (cellKey) => cells.current.get(cellKey)?.signature !== signatures.get(cellKey)
    )
    const newKeys = [...found.keys()].filter((cellKey) => !cells.current.has(cellKey))
    if (staleKeys.length === 0 && newKeys.length === 0) return

    for (const cellKey of staleKeys) {
      for (const mesh of cells.current.get(cellKey)?.meshes ?? []) mesh.visible = true
      cells.current.delete(cellKey)
    }

    // …then are merged anew (in the background, a few at a time: the rest
    // stay as they are until the next quiet moment).
    let merges = 0
    for (const [cellKey, sources] of found) {
      if (cells.current.has(cellKey)) continue
      if (isInBackground && merges++ >= BACKGROUND_CELLS) {
        cancelNextMerge.current = whenQuiet(notify)
        break
      }

      cells.current.set(cellKey, {
        signature: signatures.get(cellKey) ?? "",
        meshes: sources.map(({ mesh }) => mesh),
        parts: mergeCell(cellKey, sources, getMaterial),
      })
    }

    setParts([...cells.current.values()].flatMap((cell) => cell.parts))
  }, [version, layout, cellSize, isPaused, isInBackground, floorPlace, getMaterial])
  useEffect(() => () => cancelNextMerge.current(), [])

  // New parts → the cached shadow maps must include them; free the geometry
  // of those no cell holds any more.
  const shownParts = useRef<Part[]>([])
  useLayoutEffect(() => {
    const kept = new Set(parts.map((part) => part.geometry))
    for (const part of shownParts.current) if (!kept.has(part.geometry)) part.geometry.dispose()
    shownParts.current = parts
    markShadowsDirty(invalidate)
  }, [parts, renderer, invalidate])
  useEffect(() => () => shownParts.current.forEach((part) => part.geometry.dispose()), [])

  // Drawn again only when the parts change: the scene re-renders at every
  // step of a carry, and hundreds of meshes in a cell grid add up.
  const partMeshes = useMemo(
    () =>
      parts.map((part) => (
        <mesh
          key={part.key + part.geometry.uuid}
          geometry={part.geometry}
          material={part.material}
          castShadow={part.castShadow}
          receiveShadow={part.receiveShadow}
          raycast={ignoreRaycast}
        />
      )),
    [parts]
  )

  return (
    <BatchContext.Provider value={notify}>
      <group ref={root}>{children}</group>
      <group>{partMeshes}</group>
    </BatchContext.Provider>
  )
}
