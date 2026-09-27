import { useMemo } from "react"
import { useEditorStore } from "../store"
import { edgeNodes, wallJointNodes } from "../layout"
import { DEFAULT_COLOR } from "../palette"
import { GLASS_HOST, isEdgeType, type SceneObject } from "../types"
import { GhostContext, Surface } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../sceneTheme"
import { useXray } from "./xray"

const SIZE = 0.15 // slightly proud of the wall thickness so it fills the corner notch
/** Where only glass meets, the joint is a slim metal post instead. */
const GLASS_SIZE = 0.07

const isGlass = (o: SceneObject) => o.type === "glassWall" || o.model === GLASS_HOST

/**
 * Small pillars at every node touched by a wall/door. On straight runs they sit
 * hidden inside the wall; at corners and run-ends they finish the joint cleanly.
 */
export const Posts = () => {
  const xray = useXray()
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
  // Posts at the ends of cutaway segments fade with them (as much as the most
  // faded neighbour).
  const xrayNodes = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const o of objects) {
      if (!xray.active.has(o.id)) continue
      for (const n of edgeNodes(o)) {
        const k = `${n.x},${n.z}`
        map.set(k, [...(map.get(k) ?? []), o.id])
      }
    }
    return map
  }, [objects, xray])
  const ghostFor = (k: string) => {
    const ids = xrayNodes.get(k)
    return ids ? { xray: () => Math.max(...ids.map(xray.fade)) } : null
  }

  return (
    <>
      {nodes.map((n) => {
        const k = `${n.x},${n.z}`
        const glass = !solid.has(k)
        const size = glass ? GLASS_SIZE : SIZE
        return (
          <GhostContext.Provider key={k} value={ghostFor(k)}>
            <mesh position={[n.x, (WALL.height - WALL.sink) / 2, n.z]} castShadow receiveShadow>
              <boxGeometry args={[size, WALL.height + WALL.sink, size]} />
              {glass ? (
                <Surface color={DEFAULT_COLOR.glassWall} roughness={0.4} metalness={0.4} />
              ) : (
                <Surface color={surfaces.wall} roughness={0.85} />
              )}
            </mesh>
          </GhostContext.Provider>
        )
      })}
    </>
  )
}
