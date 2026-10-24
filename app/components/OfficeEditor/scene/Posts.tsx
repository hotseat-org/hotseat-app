import { useEffect, useMemo } from "react"
import { BoxGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { useEditorStore } from "../store"
import { edgeNodes, wallJointNodes } from "../layout"
import { DEFAULT_COLOR } from "../palette"
import { GLASS_HOST, isEdgeType, type SceneObject } from "../types"
import { Surface } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../sceneTheme"
import { CutawayContext, setCutAttributes } from "./cutaway"

const SIZE = 0.15 // slightly proud of the wall thickness so it fills the corner notch
/** Where only glass meets, the joint is a slim metal post instead. */
const GLASS_SIZE = 0.07

const isGlass = (o: SceneObject) => o.type === "glassWall" || o.model === GLASS_HOST

/**
 * Small pillars at every node touched by a wall/door. On straight runs they sit
 * hidden inside the wall; at corners and run-ends they finish the joint cleanly.
 */
export const Posts = () => {
  const objects = useEditorStore((s) => s.objects)
  const nodes = useMemo(() => wallJointNodes(objects), [objects])
  const surfaces = useSurfaces()
  // Nodes touched by any solid wall/opening get the chunky wall post.
  const solid = useMemo(() => {
    const keys = new Set<string>()
    for (const o of objects) {
      if (!isEdgeType(o.type) || isGlass(o)) continue
      for (const n of edgeNodes(o)) keys.add(`${n.x},${n.z}`)
    }
    return keys
  }, [objects])
  // All posts of a kind as ONE mesh, each carrying its anchor for the cutaway
  // (see cutaway.ts): a draw call or two instead of one per post.
  const meshes = useMemo(() => {
    const byKind = { solid: [] as BoxGeometry[], glass: [] as BoxGeometry[] }
    for (const n of nodes) {
      const isSolid = solid.has(`${n.x},${n.z}`)
      const size = isSolid ? SIZE : GLASS_SIZE
      const box = new BoxGeometry(size, WALL.height + WALL.sink, size)
      box.translate(n.x, (WALL.height - WALL.sink) / 2, n.z)
      setCutAttributes(box, new Vector3(n.x, 0, n.z), 0)
      byKind[isSolid ? "solid" : "glass"].push(box)
    }
    const merge = (boxes: BoxGeometry[]) => {
      const geometry = boxes.length ? mergeGeometries(boxes, false) : null
      boxes.forEach((b) => b.dispose())
      return geometry
    }
    return { solid: merge(byKind.solid), glass: merge(byKind.glass) }
  }, [nodes, solid])
  useEffect(
    () => () => {
      meshes.solid?.dispose()
      meshes.glass?.dispose()
    },
    [meshes]
  )

  // Sliced with the walls by the cursor cutaway.
  return (
    <CutawayContext.Provider value="mergedWall">
      {meshes.solid && (
        <mesh geometry={meshes.solid} castShadow receiveShadow>
          <Surface color={surfaces.wall} roughness={0.85} isRecessed />
        </mesh>
      )}
      {meshes.glass && (
        <mesh geometry={meshes.glass} castShadow receiveShadow>
          <Surface color={DEFAULT_COLOR.glassWall} roughness={0.4} metalness={0.4} />
        </mesh>
      )}
    </CutawayContext.Provider>
  )
}
