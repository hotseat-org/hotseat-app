import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import {
  BufferGeometry,
  Float32BufferAttribute,
  Object3D,
  type InstancedMesh,
  type WebGLProgramParametersWithUniforms,
} from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import {
  FLOOR_PART,
  SEG,
  enclosedRegions,
  footprintOverlapsSquare,
  type FloorCell,
} from "../layout"
import { isEdgeType, type SceneObject } from "../types"
import { useSurfaces } from "./sceneTheme"

const dummy = new Object3D()

/** No openings (stable: the tiles are worked out again when they change). */
const NO_HOLES: SceneObject[] = []

/** Plank width and length (m), and the seams' darkening. */
const PLANK_WIDTH = 0.18
const PLANK_LENGTH = 1.2
const SEAM = 0.1
/** Each plank's tone varies by up to this much either way. */
const TONE = 0.035

const glsl = (value: number) => value.toFixed(4)

/**
 * Faint planks on the interior floor, computed in its shader (no texture): rows
 * along X with staggered joints, each plank a slightly different tone, thin
 * darker seams. Seams fade out as the view zooms out, before they're thin
 * enough to shimmer.
 */
const patchPlanks = (shader: WebGLProgramParametersWithUniforms) => {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vFloor;")
    .replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      #ifdef USE_INSTANCING
        vFloor = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;
      #else
        vFloor = (modelMatrix * vec4(transformed, 1.0)).xz;
      #endif`
    )
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec2 vFloor;
      float plankHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
    )
    .replace(
      "#include <color_fragment>",
      /* glsl */ `#include <color_fragment>
      {
        float row = floor(vFloor.y / ${glsl(PLANK_WIDTH)});
        float along = vFloor.x / ${glsl(PLANK_LENGTH)} + plankHash(vec2(row, 7.0));
        float plank = floor(along);
        float tone = (plankHash(vec2(row, plank)) - 0.5) * ${glsl(TONE * 2)};
        // Distance to the nearest seam across and along, in metres.
        float across = abs(fract(vFloor.y / ${glsl(PLANK_WIDTH)}) - 0.5) * ${glsl(PLANK_WIDTH)};
        float end = abs(fract(along) - 0.5) * ${glsl(PLANK_LENGTH)};
        vec2 pixel = fwidth(vFloor);
        float seamAcross = smoothstep(${glsl(PLANK_WIDTH / 2)} - pixel.y * 1.5, ${glsl(PLANK_WIDTH / 2)}, across);
        float seamEnd = smoothstep(${glsl(PLANK_LENGTH / 2)} - pixel.x * 1.5, ${glsl(PLANK_LENGTH / 2)}, end);
        // Gone once a pixel covers more than ~2 cm of floor.
        float visible = 1.0 - smoothstep(0.008, 0.02, max(pixel.x, pixel.y));
        float seam = max(seamAcross, seamEnd) * visible;
        diffuseColor.rgb *= (1.0 + tone) * (1.0 - ${glsl(SEAM)} * seam);
      }`
    )
}
const planksKey = () => "interior-planks"

/**
 * Tints the floor inside the walls a different colour from the exterior — per
 * ROOM: a room with a floor-paint marker in it uses that colour. Renders one
 * instanced mesh of flat tiles per colour, just above the base floor (below the
 * edit grid).
 */
export const InteriorFloor = ({
  pieces,
  color,
  holes = NO_HOLES,
}: {
  /** Another floor's pieces (one below); unset, the shown floor's. */
  pieces?: SceneObject[]
  /** Every room in this one plain colour — a ceiling, not floorboards. */
  color?: string
  /** Openings in it — stairs coming up through it: no floor where they stand. */
  holes?: SceneObject[]
}) => {
  // Rooms depend only on walls/doors/windows and floor paints — a key of those,
  // so moving furniture doesn't re-run the flood fill.
  const shownKey = useEditorStore((state) =>
    state.objects
      .filter((object) => isEdgeType(object.type) || object.type === "floorPaint")
      .map(
        (object) =>
          `${object.type}:${object.x}:${object.z}:${object.rotation}:${object.color ?? ""}`
      )
      .join("|")
  )
  const store = useEditorStoreApi()
  const surfaces = useSurfaces()
  // Another floor's pieces change only with the layout: they're the key.
  const key = pieces ?? shownKey
  const groups = useMemo(() => {
    void key // recompute exactly when the rooms can have changed
    const objects = pieces ?? store.getState().objects
    const paints = objects.filter((object) => object.type === "floorPaint" && object.color)
    const byColor = new Map<string, FloorCell[]>()
    // Squares an opening covers have no floor.
    const isOpen = (cell: FloorCell) =>
      holes.some((hole) => footprintOverlapsSquare(hole, cell.x + SEG / 2, cell.z + SEG / 2))
    for (const region of enclosedRegions(objects).map((cells) =>
      holes.length ? cells.filter((cell) => !isOpen(cell)) : cells
    )) {
      // Last paint inside the room wins.
      const paint = [...paints]
        .reverse()
        .find((floorPaint) =>
          region.some(
            (cell) =>
              cell.x <= floorPaint.x &&
              floorPaint.x < cell.x + SEG &&
              cell.z <= floorPaint.z &&
              floorPaint.z < cell.z + SEG
          )
        )
      const color = paint?.color ?? surfaces.floorInside
      byColor.set(color, [...(byColor.get(color) ?? []), ...region])
    }

    return [...byColor]
  }, [key, pieces, holes, store, surfaces.floorInside])

  return (
    <>
      {color ? (
        <FloorTiles color={color} cells={groups.flatMap(([, cells]) => cells)} isPlain />
      ) : (
        groups.map(([roomColor, cells]) => (
          <FloorTiles key={roomColor} color={roomColor} cells={cells} />
        ))
      )}
    </>
  )
}

/** One colour's worth of interior floor: whole squares as tiles, cut ones as triangles. */
const FloorTiles = ({
  color,
  cells: all,
  isPlain = false,
}: {
  color: string
  cells: FloorCell[]
  /** No floorboards (a ceiling). */
  isPlain?: boolean
}) => {
  const invalidate = useThree((state) => state.invalidate)
  const ref = useRef<InstancedMesh>(null)
  const cells = useMemo(() => all.filter((cell) => cell.parts === undefined), [all])
  const cutCells = useMemo(() => all.filter((cell) => cell.parts !== undefined), [all])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return

    cells.forEach((cell, i) => {
      dummy.position.set(cell.x + SEG / 2, 0.006, cell.z + SEG / 2)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = cells.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate() // redraw under frameloop="demand"
  }, [cells, invalidate])

  return (
    <>
      {cells.length > 0 && (
        // Keyed by count so the instance buffer is re-sized when the room grows/shrinks.
        <instancedMesh
          key={cells.length}
          ref={ref}
          args={[undefined, undefined, cells.length]}
          receiveShadow
        >
          <planeGeometry args={[SEG, SEG]} />
          <FloorSurface color={color} isPlain={isPlain} />
        </instancedMesh>
      )}
      {cutCells.length > 0 && <CutFloor color={color} cells={cutCells} isPlain={isPlain} />}
    </>
  )
}

// Never disposed with the floor (see Surface): another floor shown and back
// would compile the shader again.
const FloorSurface = ({ color, isPlain }: { color: string; isPlain: boolean }) =>
  isPlain ? (
    <meshStandardMaterial color={color} roughness={0.95} dispose={null} />
  ) : (
    <meshStandardMaterial
      color={color}
      roughness={0.92}
      onBeforeCompile={patchPlanks}
      customProgramCacheKey={planksKey}
      dispose={null}
    />
  )

/**
 * The squares a diagonal wall cuts: only their triangles inside the room (a
 * square's quarters between its diagonals, see FLOOR_PART), as one mesh.
 */
const CutFloor = ({
  color,
  cells,
  isPlain,
}: {
  color: string
  cells: FloorCell[]
  isPlain: boolean
}) => {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const y = 0.006
    for (const cell of cells) {
      const [minX, minZ, maxX, maxZ] = [cell.x, cell.z, cell.x + SEG, cell.z + SEG]
      const [centreX, centreZ] = [cell.x + SEG / 2, cell.z + SEG / 2]
      // Each quarter: its outer side, wound so the face looks up.
      const quarters: [number, [number, number], [number, number]][] = [
        [FLOOR_PART.south, [minX, minZ], [maxX, minZ]],
        [FLOOR_PART.east, [maxX, minZ], [maxX, maxZ]],
        [FLOOR_PART.north, [maxX, maxZ], [minX, maxZ]],
        [FLOOR_PART.west, [minX, maxZ], [minX, minZ]],
      ]
      for (const [part, from, to] of quarters)
        if ((cell.parts ?? 0) & part)
          positions.push(from[0], y, from[1], centreX, y, centreZ, to[0], y, to[1])
    }
    const cutGeometry = new BufferGeometry()
    cutGeometry.setAttribute("position", new Float32BufferAttribute(positions, 3))
    cutGeometry.computeVertexNormals()

    return cutGeometry
  }, [cells])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} receiveShadow>
      <FloorSurface color={color} isPlain={isPlain} />
    </mesh>
  )
}
