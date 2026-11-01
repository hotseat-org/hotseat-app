import { useEffect, useMemo } from "react"
import { DataTexture, LinearFilter, RedFormat, UnsignedByteType, Vector2, Vector3 } from "three"
import { distance, float, length, max, select, smoothstep, texture, uniform } from "three/tsl"
import type { Node } from "three/webgpu"
import { getStructureField, type StructureField } from "../landscape/structureField"
import { useEditorStore } from "../store"
import { GRID, type Tool } from "../types"

/**
 * Where the editing grid shows: hugging what's built — it spreads this far (m)
 * round every wall and piece, so its outline follows the building's shape —
 * or, with nothing built yet, round the starting point. While building or
 * placing, also a small patch round the cursor, so you see where things snap
 * away from the building. The contours give way to exactly the same area (see
 * Contours), so the two never draw over each other.
 */
const STRUCTURE_REACH = 6
const EMPTY_REACH = 14
const CURSOR_REACH = 5

/** The pointer on the ground, shared by every material that reads the area. */
export const buildCursor = new Vector3(1e6, 0, 1e6)
export const moveBuildCursor = (x: number, z: number) => buildCursor.set(x, 0, z)
export const hideBuildCursor = () => buildCursor.set(1e6, 0, 1e6)

/** Stands in for the distance map while there's no structure (never read then). */
const NO_MAP = new DataTexture(new Uint8Array([255]), 1, 1, RedFormat, UnsignedByteType)
NO_MAP.needsUpdate = true

/**
 * The build area for a material (TSL): `getArea(p)` is 1 on and near the
 * structure (or the cursor), easing to 0 — near the structure by the distance
 * map (metres to the nearest wall or piece, stored as a fraction of `reach`);
 * with none, round the origin. Its uniforms are set by useBuildArea.
 */
export const createBuildArea = () => {
  const mapOrigin = uniform(new Vector2())
  const mapSize = uniform(new Vector2(1, 1))
  const hasStructure = uniform(0)
  const reach = uniform(EMPTY_REACH)
  const cursorReach = uniform(0)
  const cursor = uniform(buildCursor)
  // One per material that reads it, all set together.
  const distanceMaps: ReturnType<typeof texture>[] = []

  const getArea = (point: Node<"vec2">) => {
    const mapUv = point.sub(mapOrigin).div(mapSize)
    const distanceMap = texture(NO_MAP, mapUv)
    distanceMaps.push(distanceMap)
    const isInside = mapUv.x
      .greaterThanEqual(0)
      .and(mapUv.y.greaterThanEqual(0))
      .and(mapUv.x.lessThanEqual(1))
      .and(mapUv.y.lessThanEqual(1))
    const fromMap = select(isInside, distanceMap.r.mul(reach), reach)
    const away = select(hasStructure.greaterThan(0.5), fromMap, length(point))
    const near = float(1).sub(smoothstep(reach.mul(0.35), reach.mul(0.95), away))
    const atCursor = select(
      cursorReach.greaterThan(0),
      float(1).sub(smoothstep(cursorReach.mul(0.3), cursorReach, distance(point, cursor.xz))),
      float(0)
    )

    return max(near, atCursor)
  }

  return {
    getArea,
    set: ({ map, isPlacing }: { map: DistanceMap | null; isPlacing: boolean }) => {
      for (const distanceMap of distanceMaps) distanceMap.value = map?.texture ?? NO_MAP
      if (map) {
        mapOrigin.value.copy(map.origin)
        mapSize.value.copy(map.size)
      }

      hasStructure.value = map ? 1 : 0
      reach.value = map ? STRUCTURE_REACH : EMPTY_REACH
      cursorReach.value = isPlacing ? CURSOR_REACH : 0
    },
  }
}
export type BuildArea = ReturnType<typeof createBuildArea>

/** The structure's distance map: a texture, and where it lies on the ground (m). */
interface DistanceMap {
  texture: DataTexture
  origin: Vector2
  size: Vector2
}

/**
 * The structure field's distances (see structureField.ts) as a byte texture —
 * a fraction of the reach — that the shaders blend smoothly.
 */
const buildDistanceMap = (field: StructureField | null): DistanceMap | null => {
  if (!field) return null

  const { cells, width: width, height: height, minX, minZ } = field.grid
  const bytes = new Uint8Array(width * height)
  for (let index = 0; index < cells.length; index++)
    bytes[index] = Math.min(255, Math.round((cells[index] / STRUCTURE_REACH) * 255))
  const texture = new DataTexture(bytes, width, height, RedFormat, UnsignedByteType)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.unpackAlignment = 1
  texture.needsUpdate = true

  // Texel centres sit on the cell centres.
  return {
    texture,
    origin: new Vector2(minX - GRID / 2, minZ - GRID / 2),
    size: new Vector2(width * GRID, height * GRID),
  }
}

/** Building or placing: a build tool armed, or furniture being carried. */
const isPlacing = (tool: Tool, carryingId: string | null) =>
  carryingId !== null || (tool !== "select" && tool !== "paint")

/**
 * Sets a build area (made with createBuildArea) to the current layout and
 * tool — on every render (cheap: plain values).
 */
export const useBuildArea = () => {
  // A carried piece doesn't change it until it's set down (see heldPlacement):
  // its field takes ~100 ms on a big office.
  const objects = useEditorStore((state) => state.objects)
  // Higher up, the floors below too: their ceilings are what's built on.
  const floors = useEditorStore((state) => state.floors)
  const currentFloor = useEditorStore((state) => state.currentFloor)
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const placing = useEditorStore((state) => isPlacing(state.tool, state.carryingId))
  const field = useMemo(() => {
    const level = floors.findIndex((floor) => floor.id === currentFloor)
    const below = new Set(floors.slice(0, Math.max(0, level)).map((floor) => floor.id))

    return getStructureField([
      ...objects,
      ...otherFloorsPieces.filter((piece) => piece.floor && below.has(piece.floor)),
    ])
  }, [objects, floors, currentFloor, otherFloorsPieces])
  // The same field (a piece moved within a room): the same map.
  const map = useMemo(() => buildDistanceMap(field), [field])
  useEffect(() => () => map?.texture.dispose(), [map])

  return (area: BuildArea) => area.set({ map, isPlacing: placing })
}
