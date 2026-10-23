import { useThree, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useSurfaces } from "../sceneTheme"
import { BUILD_HALF, GRID } from "../types"
import {
  BUILD_AREA_GLSL,
  createBuildAreaUniforms,
  hideBuildCursor,
  moveBuildCursor,
  useBuildArea,
} from "./buildArea"

/** The ground: past any view and the whole (practically endless) build area. */
const GROUND_SIZE = BUILD_HALF * 4

interface Props {
  // Raw ground coordinates — Scene snaps them per-object (footprint aware).
  onDown: (x: number, z: number, button: number, e: PointerEvent) => void
  onMove: (x: number, z: number) => void
  onUp: (x: number, z: number, button: number) => void
  onLeave: () => void
  /** A click (not a drag) on the floor; `delta` = pointer travel in px. */
  onClick?: (delta: number) => void
  /** Grid is a build aid — shown only while editing. */
  showGrid?: boolean
}

/**
 * The endless ground — also what pointer events hit for placing and drawing —
 * and, while editing, the build grid hugging the structure (see buildArea.ts).
 */
export const Ground = ({ onDown, onMove, onUp, onLeave, onClick, showGrid = true }: Props) => {
  const surfaces = useSurfaces()
  const invalidate = useThree((s) => s.invalidate)
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(e: ThreeEvent<PointerEvent>) =>
          onDown(e.point.x, e.point.z, e.button, e.nativeEvent)
        }
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          onMove(e.point.x, e.point.z)
          // The grid's patch round the cursor follows it (needs a frame).
          if (showGrid) {
            moveBuildCursor(e.point.x, e.point.z)
            invalidate()
          }
        }}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => onUp(e.point.x, e.point.z, e.button)}
        onPointerLeave={() => {
          onLeave()
          hideBuildCursor()
          invalidate()
        }}
        onClick={onClick ? (e: ThreeEvent<MouseEvent>) => onClick(e.delta) : undefined}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        <meshStandardMaterial color={surfaces.floor} roughness={0.95} fog={false} />
      </mesh>

      {showGrid && <BuildGrid color={surfaces.grid} />}
    </group>
  )
}

/**
 * Hairline grid lines on whole cells, faded by the build area: solid round
 * the walls and pieces (or round the start, when empty) and, while building,
 * round the cursor — gone beyond. Lines are in world space, so they always match snapping.
 */
const BuildGrid = ({ color }: { color: string }) => {
  const applyBuildArea = useBuildArea()
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...createBuildAreaUniforms(),
          color: { value: new THREE.Color() },
          cell: { value: GRID },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 color;
          uniform float cell;
          varying vec3 vWorld;
          ${BUILD_AREA_GLSL}
          void main() {
            vec2 r = vWorld.xz / cell;
            vec2 g = abs(fract(r - 0.5) - 0.5) / fwidth(r);
            float line = 1.0 - min(min(g.x, g.y) + 0.1, 1.0);
            float a = line * buildArea(vWorld.xz);
            if (a <= 0.004) discard;
            gl_FragColor = vec4(color, a);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        transparent: true,
        depthWrite: false,
      }),
    []
  )
  useEffect(() => () => material.dispose(), [material])
  material.uniforms.color.value.set(color)
  applyBuildArea(material.uniforms)

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.008, 0]}
      material={material}
      raycast={() => null}
    >
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
    </mesh>
  )
}
