import { Grid } from "@react-three/drei"
import type { ThreeEvent } from "@react-three/fiber"
import { useSurfaces } from "../sceneTheme"
import { BUILD_HALF, GRID } from "../types"

const FLOOR = BUILD_HALF * 2
/** Visual-only floor reaching past any view, so there's no "work area" edge. */
const BACKDROP = 2000

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

/** Soft endless floor + build grid. The FLOOR mesh is the raycast target for placement. */
export const Ground = ({ onDown, onMove, onUp, onLeave, onClick, showGrid = true }: Props) => {
  const surfaces = useSurfaces()
  return (
    <group>
      {/* Endless floor in the same colour — not a raycast target, so building
          stays limited to the FLOOR area below. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.004, 0]}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[BACKDROP, BACKDROP]} />
        <meshStandardMaterial color={surfaces.floor} roughness={0.95} fog={false} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(e: ThreeEvent<PointerEvent>) =>
          onDown(e.point.x, e.point.z, e.button, e.nativeEvent)
        }
        onPointerMove={(e: ThreeEvent<PointerEvent>) => onMove(e.point.x, e.point.z)}
        onPointerUp={(e: ThreeEvent<PointerEvent>) => onUp(e.point.x, e.point.z, e.button)}
        onPointerLeave={onLeave}
        onClick={onClick ? (e: ThreeEvent<MouseEvent>) => onClick(e.delta) : undefined}
      >
        <planeGeometry args={[FLOOR, FLOOR]} />
        <meshStandardMaterial color={surfaces.floor} roughness={0.95} fog={false} />
      </mesh>

      {showGrid && (
        <Grid
          position={[0, 0.008, 0]}
          args={[FLOOR, FLOOR]}
          cellSize={GRID}
          cellThickness={0.9}
          cellColor={surfaces.grid}
          // Uniform grid — no larger "section" squares.
          sectionSize={GRID}
          sectionThickness={0.9}
          sectionColor={surfaces.grid}
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />
      )}
    </group>
  )
}
