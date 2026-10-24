import { useLayoutEffect, useMemo, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { Object3D, type InstancedMesh, type WebGLProgramParametersWithUniforms } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import { SEG, enclosedRegions } from "../layout"
import { isEdgeType, type Cell } from "../types"
import { useSurfaces } from "../sceneTheme"

const dummy = new Object3D()

/** Plank width and length (m), and the seams' darkening. */
const PLANK_WIDTH = 0.18
const PLANK_LENGTH = 1.2
const SEAM = 0.1
/** Each plank's tone varies by up to this much either way. */
const TONE = 0.035

const glsl = (n: number) => n.toFixed(4)

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
export const InteriorFloor = () => {
  // Rooms depend only on walls/doors/windows and floor paints — a key of those,
  // so moving furniture doesn't re-run the flood fill.
  const key = useEditorStore((s) =>
    s.objects
      .filter((o) => isEdgeType(o.type) || o.type === "floorPaint")
      .map((o) => `${o.type}:${o.x}:${o.z}:${o.rotation}:${o.color ?? ""}`)
      .join("|")
  )
  const store = useEditorStoreApi()
  const surfaces = useSurfaces()
  const groups = useMemo(() => {
    void key // recompute exactly when the rooms can have changed
    const objects = store.getState().objects
    const paints = objects.filter((o) => o.type === "floorPaint" && o.color)
    const byColor = new Map<string, Cell[]>()
    for (const region of enclosedRegions(objects)) {
      // Last paint inside the room wins.
      const paint = [...paints]
        .reverse()
        .find((p) =>
          region.some((c) => c.x <= p.x && p.x < c.x + SEG && c.z <= p.z && p.z < c.z + SEG)
        )
      const color = paint?.color ?? surfaces.floorInside
      byColor.set(color, [...(byColor.get(color) ?? []), ...region])
    }
    return [...byColor]
  }, [key, store, surfaces.floorInside])

  return (
    <>
      {groups.map(([color, cells]) => (
        <FloorTiles key={color} color={color} cells={cells} />
      ))}
    </>
  )
}

/** One colour's worth of interior floor tiles. */
const FloorTiles = ({ color, cells }: { color: string; cells: Cell[] }) => {
  const invalidate = useThree((s) => s.invalidate)
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    cells.forEach((c, i) => {
      dummy.position.set(c.x + SEG / 2, 0.006, c.z + SEG / 2)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = cells.length
    mesh.instanceMatrix.needsUpdate = true
    invalidate() // redraw under frameloop="demand"
  }, [cells, invalidate])

  if (cells.length === 0) return null
  return (
    // Keyed by count so the instance buffer is re-sized when the room grows/shrinks.
    <instancedMesh
      key={cells.length}
      ref={ref}
      args={[undefined, undefined, cells.length]}
      receiveShadow
    >
      <planeGeometry args={[SEG, SEG]} />
      <meshStandardMaterial
        color={color}
        roughness={0.92}
        onBeforeCompile={patchPlanks}
        customProgramCacheKey={planksKey}
      />
    </instancedMesh>
  )
}
