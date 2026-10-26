import { useEffect, useMemo } from "react"
import { BoxGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { useObjectsWithPaintPreview } from "../store"
import { composeWallColors, wallJointNodes } from "../layout"
import { DEFAULT_COLOR } from "../palette"
import { Surface } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../sceneTheme"
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
  const nodes = useMemo(() => wallJointNodes(objects), [objects])
  const surfaces = useSurfaces()
  // Nodes touched by any solid wall/opening get the chunky wall post, in the
  // paint of its walls.
  const joints = useMemo(() => composeWallColors(objects).joints, [objects])
  // All posts of a colour as ONE mesh, each carrying its anchor for the
  // cutaway (see cutaway.ts): a draw call per colour instead of one per post.
  const meshes = useMemo(() => {
    const solid = new Map<string, BoxGeometry[]>()
    const glass: BoxGeometry[] = []
    for (const n of nodes) {
      const key = `${n.x},${n.z}`
      const isSolid = joints.has(key)
      const size = isSolid ? SIZE : GLASS_SIZE
      const box = new BoxGeometry(size, WALL.height + WALL.sink, size)
      box.translate(n.x, (WALL.height - WALL.sink) / 2, n.z)
      setCutAttributes(box, new Vector3(n.x, 0, n.z), 0)
      if (!isSolid) {
        glass.push(box)
        continue
      }
      // One post — or, the walls' faces round it painted apart, four quarter
      // pillars, each in the paint of the faces looking into its corner.
      const quarters = (joints.get(key) ?? []).map((c) => c ?? surfaces.wall)
      const add = (color: string, geometry: BoxGeometry) =>
        solid.set(color, [...(solid.get(color) ?? []), geometry])
      if (new Set(quarters).size === 1) {
        add(quarters[0], box)
        continue
      }
      box.dispose()
      quarters.forEach((color, q) => {
        const quarter = new BoxGeometry(SIZE / 2, WALL.height + WALL.sink, SIZE / 2)
        const dx = (q % 2 ? 1 : -1) * (SIZE / 4)
        const dz = (q < 2 ? -1 : 1) * (SIZE / 4)
        quarter.translate(n.x + dx, (WALL.height - WALL.sink) / 2, n.z + dz)
        setCutAttributes(quarter, new Vector3(n.x, 0, n.z), 0)
        add(color, quarter)
      })
    }
    const merge = (boxes: BoxGeometry[]) => {
      const geometry = boxes.length ? mergeGeometries(boxes, false) : null
      boxes.forEach((b) => b.dispose())
      return geometry
    }
    return {
      solid: [...solid].map(([color, boxes]) => ({ color, geometry: merge(boxes) })),
      glass: merge(glass),
    }
  }, [nodes, joints, surfaces.wall])
  useEffect(
    () => () => {
      meshes.solid.forEach((m) => m.geometry?.dispose())
      meshes.glass?.dispose()
    },
    [meshes]
  )

  // Sliced with the walls by the cursor cutaway.
  return (
    <CutawayContext.Provider value="mergedWall">
      {meshes.solid.map((m) => (
        <mesh key={m.color} geometry={m.geometry ?? undefined} castShadow receiveShadow>
          <Surface color={m.color} roughness={0.85} isRecessed />
        </mesh>
      ))}
      {meshes.glass && (
        <mesh geometry={meshes.glass} castShadow receiveShadow>
          <Surface color={DEFAULT_COLOR.glassWall} roughness={0.4} metalness={0.4} />
        </mesh>
      )}
    </CutawayContext.Provider>
  )
}
