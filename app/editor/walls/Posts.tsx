import { useEffect, useMemo } from "react"
import { BoxGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { useObjectsWithPaintPreview } from "../store"
import { composeWallColors, getCellKey, wallJointNodes } from "../layout"
import { Surface } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../scene/sceneTheme"
import { getItem } from "../catalog"
import { getRenderer } from "../catalog/rendering"
import { isWall } from "../types"
import { CutawayContext, setCutAttributes } from "./cutaway"

const SIZE = 0.15 // slightly proud of the wall thickness so it fills the corner notch
/** Where only glass meets, the joint is a slim metal post instead. */
const GLASS_SIZE = 0.07

/**
 * Small pillars at every node touched by a wall/door. On straight runs they sit
 * hidden inside the wall; at corners and run-ends they finish the joint cleanly.
 */
export const Posts = () => {
  const objects = useObjectsWithPaintPreview()
  // Where walls (and what's cut into them) meet: other runs, like fences,
  // join without wall posts.
  const nodes = useMemo(
    () =>
      wallJointNodes(
        objects.filter((object) => !isWall(object.type) || getRenderer(object.type).isDrawnAsRun)
      ),
    [objects]
  )
  const surfaces = useSurfaces()
  // Nodes touched by any solid wall/opening get the chunky wall post, in the
  // paint of its walls.
  const joints = useMemo(() => composeWallColors(objects).joints, [objects])
  // All posts of a colour as ONE mesh, each carrying its anchor for the
  // cutaway (see cutaway.ts): a draw call per colour instead of one per post.
  const meshes = useMemo(() => {
    const solid = new Map<string, BoxGeometry[]>()
    const glass: BoxGeometry[] = []
    for (const node of nodes) {
      const key = getCellKey(node.x, node.z)
      const isSolid = joints.has(key)
      const size = isSolid ? SIZE : GLASS_SIZE
      const box = new BoxGeometry(size, WALL.height + WALL.sink, size)
      box.translate(node.x, (WALL.height - WALL.sink) / 2, node.z)
      setCutAttributes(box, new Vector3(node.x, 0, node.z), 0)
      if (!isSolid) {
        glass.push(box)
        continue
      }

      // One post — or, the walls' faces round it painted apart, four quarter
      // pillars, each in the paint of the faces looking into its corner.
      const quarters = (joints.get(key) ?? []).map((color) => color ?? surfaces.wall)
      const add = (color: string, geometry: BoxGeometry) =>
        solid.set(color, [...(solid.get(color) ?? []), geometry])
      if (new Set(quarters).size === 1) {
        add(quarters[0], box)
        continue
      }

      box.dispose()
      quarters.forEach((color, quarterIndex) => {
        const quarter = new BoxGeometry(SIZE / 2, WALL.height + WALL.sink, SIZE / 2)
        const deltaX = (quarterIndex % 2 ? 1 : -1) * (SIZE / 4)
        const deltaZ = (quarterIndex < 2 ? -1 : 1) * (SIZE / 4)
        quarter.translate(node.x + deltaX, (WALL.height - WALL.sink) / 2, node.z + deltaZ)
        setCutAttributes(quarter, new Vector3(node.x, 0, node.z), 0)
        add(color, quarter)
      })
    }
    const merge = (boxes: BoxGeometry[]) => {
      const geometry = boxes.length ? mergeGeometries(boxes, false) : null
      boxes.forEach((box) => box.dispose())

      return geometry
    }

    return {
      solid: [...solid].map(([color, boxes]) => ({ color, geometry: merge(boxes) })),
      glass: merge(glass),
    }
  }, [nodes, joints, surfaces.wall])
  useEffect(
    () => () => {
      meshes.solid.forEach((mesh) => mesh.geometry?.dispose())
      meshes.glass?.dispose()
    },
    [meshes]
  )

  // Sliced with the walls by the cursor cutaway.
  return (
    <CutawayContext.Provider value="mergedWall">
      {meshes.solid.map((mesh) => (
        <mesh key={mesh.color} geometry={mesh.geometry ?? undefined} castShadow receiveShadow>
          <Surface color={mesh.color} roughness={0.85} isRecessed />
        </mesh>
      ))}
      {meshes.glass && (
        <mesh geometry={meshes.glass} castShadow receiveShadow>
          <Surface color={getItem("glassWall").defaultColor} roughness={0.4} metalness={0.4} />
        </mesh>
      )}
    </CutawayContext.Provider>
  )
}
