import { useEffect, useMemo } from "react"
import {
  DataTexture,
  LinearFilter,
  RedFormat,
  UnsignedByteType,
  Vector2,
  Vector3,
  type IUniform,
} from "three"
import { getStructureField } from "../landscape/structureField"
import { useEditorStore } from "../store"
import { GRID, type SceneObject, type Tool } from "../types"

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

/** Uniforms for BUILD_AREA_GLSL (the cursor is the shared vector above). */
export const createBuildAreaUniforms = () => ({
  distanceMap: { value: null as DataTexture | null },
  mapOrigin: { value: new Vector2() },
  mapSize: { value: new Vector2(1, 1) },
  hasStructure: { value: false },
  reach: { value: EMPTY_REACH },
  cursor: { value: buildCursor },
  cursorReach: { value: 0 },
})

/**
 * `buildArea(p)`: 1 on and near the structure (or the cursor), easing to 0.
 * Near the structure = by the distance map (metres to the nearest wall or
 * piece, stored as a fraction of `reach`); with none, round the origin.
 */
export const BUILD_AREA_GLSL = /* glsl */ `
  uniform sampler2D distanceMap; // (not "distance": that's GLSL's built-in)
  uniform vec2 mapOrigin;
  uniform vec2 mapSize;
  uniform bool hasStructure;
  uniform float reach;
  uniform vec3 cursor;
  uniform float cursorReach;
  float buildArea(vec2 p) {
    float d = length(p);
    if (hasStructure) {
      vec2 uv = (p - mapOrigin) / mapSize;
      bool inside = uv.x >= 0.0 && uv.y >= 0.0 && uv.x <= 1.0 && uv.y <= 1.0;
      d = inside ? texture2D(distanceMap, uv).r * reach : reach;
    }
    float near = 1.0 - smoothstep(reach * 0.35, reach * 0.95, d);
    float atCursor = cursorReach > 0.0
      ? 1.0 - smoothstep(cursorReach * 0.3, cursorReach, distance(p, cursor.xz))
      : 0.0;
    return max(near, atCursor);
  }
`

/**
 * The structure field's distances (see structureField.ts) as a byte texture —
 * a fraction of the reach — that the shaders blend smoothly.
 */
const buildDistanceMap = (objects: SceneObject[]) => {
  const field = getStructureField(objects)
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
 * The area's uniforms for the current layout and tool, for any material made
 * with createBuildAreaUniforms — set on every render (cheap: plain values).
 */
export const useBuildArea = () => {
  const objects = useEditorStore((state) => state.objects)
  // Higher up, the floor right below too: its ceiling is what's built on.
  const floorBelow = useEditorStore((state) => {
    const level = state.floors.findIndex((floor) => floor.id === state.currentFloor)

    return level > 0 ? state.floors[level - 1].id : null
  })
  const otherFloorsPieces = useEditorStore((state) => state.otherFloorsPieces)
  const placing = useEditorStore((state) => isPlacing(state.tool, state.carryingId))
  const map = useMemo(
    () =>
      buildDistanceMap(
        floorBelow
          ? [...objects, ...otherFloorsPieces.filter((piece) => piece.floor === floorBelow)]
          : objects
      ),
    [objects, floorBelow, otherFloorsPieces]
  )
  useEffect(() => () => map?.texture.dispose(), [map])

  // A ShaderMaterial's uniforms (made with createBuildAreaUniforms).
  return (uniforms: Record<string, IUniform>) => {
    uniforms.distanceMap.value = map?.texture ?? null
    if (map) {
      uniforms.mapOrigin.value.copy(map.origin)
      uniforms.mapSize.value.copy(map.size)
    }

    uniforms.hasStructure.value = !!map
    uniforms.reach.value = map ? STRUCTURE_REACH : EMPTY_REACH
    uniforms.cursorReach.value = placing ? CURSOR_REACH : 0
  }
}
