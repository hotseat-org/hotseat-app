import { useThree, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { useSurfaces } from "../scene/sceneTheme"
import { BUILD_HALF, GRID } from "../types"
import { abs, float, fract, fwidth, min, positionWorld, uniform } from "three/tsl"
import { MeshBasicNodeMaterial } from "three/webgpu"
import {
  createBuildArea,
  hideBuildCursor,
  moveBuildCursor,
  useBuildArea,
} from "../building/buildArea"

/** The ground: past any view and the whole (practically endless) build area. */
export const GROUND_SIZE = BUILD_HALF * 4

interface Props {
  // Raw ground coordinates — Scene snaps them per-object (footprint aware).
  onDown: (point: { x: number; z: number }, button: number, event: PointerEvent) => void
  onMove: (x: number, z: number) => void
  onUp: (x: number, z: number, button: number) => void
  onLeave: () => void
  /** A click (not a drag) on the floor; `delta` = pointer travel in px. */
  onClick?: (delta: number) => void
  /** Grid is a build aid — shown only while editing. */
  showGrid?: boolean
  /**
   * The shown floor is the ground floor (default). Higher up, this is only the
   * level everything's placed on — invisible, the ground is drawn below (see
   * FloorStack) — with the build grid on it.
   */
  isGroundFloor?: boolean
}

/**
 * The endless ground — also what pointer events hit for placing and drawing —
 * and, while editing, the build grid hugging the structure (see buildArea.ts).
 */
export const Ground = ({
  onDown,
  onMove,
  onUp,
  onLeave,
  onClick,
  showGrid = true,
  isGroundFloor = true,
}: Props) => {
  const surfaces = useSurfaces()
  const invalidate = useThree((state) => state.invalidate)

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(event: ThreeEvent<PointerEvent>) =>
          onDown({ x: event.point.x, z: event.point.z }, event.button, event.nativeEvent)
        }
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          onMove(event.point.x, event.point.z)
          // The grid's patch round the cursor follows it (needs a frame).
          if (showGrid) {
            moveBuildCursor(event.point.x, event.point.z)
            invalidate()
          }
        }}
        onPointerUp={(event: ThreeEvent<PointerEvent>) =>
          onUp(event.point.x, event.point.z, event.button)
        }
        onPointerLeave={() => {
          onLeave()
          hideBuildCursor()
          invalidate()
        }}
        onClick={onClick ? (event: ThreeEvent<MouseEvent>) => onClick(event.delta) : undefined}
      >
        <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
        {isGroundFloor ? (
          <meshStandardMaterial color={surfaces.floor} roughness={0.95} fog={false} />
        ) : (
          <meshBasicMaterial visible={false} />
        )}
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
  const { material, area, lineColor } = useMemo(() => {
    const buildArea = createBuildArea()
    const tint = uniform(new THREE.Color())
    // A line on every cell edge, a pixel wide at any zoom.
    const cells = positionWorld.xz.div(GRID)
    const toEdge = abs(fract(cells.sub(0.5)).sub(0.5)).div(fwidth(cells))
    const line = float(1).sub(min(min(toEdge.x, toEdge.y).add(0.1), 1))
    const alpha = line.mul(buildArea.getArea(positionWorld.xz))
    const gridMaterial = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false })
    gridMaterial.colorNode = tint
    gridMaterial.opacityNode = alpha
    gridMaterial.maskNode = alpha.greaterThan(0.004)

    return { material: gridMaterial, area: buildArea, lineColor: tint }
  }, [])
  useEffect(() => () => material.dispose(), [material])
  lineColor.value.set(color)
  applyBuildArea(area)

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
