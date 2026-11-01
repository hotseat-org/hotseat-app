import { GRID } from "../types"
import { shade } from "../plan/shapes"
import { Surface } from "./Surface"
import { STOREY } from "./dimensions"

/** The stairs' size (world units): two squares wide, six long, one storey up. */
export const STAIRS = {
  width: 2 * GRID,
  length: 6 * GRID,
  steps: 8,
}

const STEP_RISE = STOREY / STAIRS.steps
const STEP_RUN = STAIRS.length / STAIRS.steps
/** The treads' width, inside the stringers. */
const TREAD_WIDTH = STAIRS.width - 0.12
const STRINGER = 0.05
const RAIL_HEIGHT = 0.42
const RAIL_THICKNESS = 0.035
const HANDRAIL_COLOR = "#5f6878"

interface Props {
  color?: string
}

/**
 * Stairs up a storey: eight treads rising from the front (+Z, the foot) to
 * the back, where they reach the floor above; a stringer and a handrail
 * along each side.
 */
export const Stairs = ({ color = "#c9b79c" }: Props) => {
  const steps = Array.from({ length: STAIRS.steps }, (_, index) => {
    const height = (index + 1) * STEP_RISE

    return { height, z: STAIRS.length / 2 - (index + 0.5) * STEP_RUN }
  })
  // The handrail follows the treads' nosing, a rail's height above them.
  const slope = Math.atan2(STOREY, STAIRS.length)
  const railLength = Math.hypot(STOREY, STAIRS.length)

  return (
    <group>
      {steps.map(({ height, z }, index) => (
        <mesh key={index} position={[0, height / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[TREAD_WIDTH, height, STEP_RUN]} />
          <Surface color={index % 2 ? color : shade(color, 0.96)} roughness={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[(side * (STAIRS.width - STRINGER)) / 2, 0, 0]}>
          {/* The stringer: a slanted board under the treads' ends. */}
          <mesh
            position={[0, STOREY / 2 - 0.02, 0]}
            rotation={[slope, 0, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[STRINGER, 0.16, railLength]} />
            <Surface color={shade(color, 0.8)} roughness={0.8} />
          </mesh>
          {/* The handrail, on posts at the foot and the top. */}
          <mesh position={[0, STOREY / 2 + RAIL_HEIGHT, 0]} rotation={[slope, 0, 0]} castShadow>
            <boxGeometry args={[RAIL_THICKNESS, RAIL_THICKNESS, railLength]} />
            <Surface color={HANDRAIL_COLOR} roughness={0.5} metalness={0.3} />
          </mesh>
          {[STAIRS.length / 2 - STEP_RUN / 2, -STAIRS.length / 2 + STEP_RUN / 2].map((z, index) => {
            const base = index === 0 ? STEP_RISE : STOREY

            return (
              <mesh key={z} position={[0, base + RAIL_HEIGHT / 2, z]} castShadow>
                <boxGeometry args={[RAIL_THICKNESS, RAIL_HEIGHT, RAIL_THICKNESS]} />
                <Surface color={HANDRAIL_COLOR} roughness={0.5} metalness={0.3} />
              </mesh>
            )
          })}
        </group>
      ))}
    </group>
  )
}

/**
 * On the floor above stairs: a guard rail round the opening they come up
 * through — along both sides and across the foot, open at the back, where
 * the stairs arrive. In the stairs' own frame.
 */
export const StairsLanding = () => {
  const halfWidth = STAIRS.width / 2
  const halfLength = STAIRS.length / 2
  const rails: { position: [number, number, number]; size: [number, number, number] }[] = [
    {
      position: [-halfWidth, RAIL_HEIGHT, 0],
      size: [RAIL_THICKNESS, RAIL_THICKNESS, STAIRS.length],
    },
    {
      position: [halfWidth, RAIL_HEIGHT, 0],
      size: [RAIL_THICKNESS, RAIL_THICKNESS, STAIRS.length],
    },
    {
      position: [0, RAIL_HEIGHT, halfLength],
      size: [STAIRS.width, RAIL_THICKNESS, RAIL_THICKNESS],
    },
  ]
  const posts: [number, number][] = [
    [-halfWidth, halfLength],
    [halfWidth, halfLength],
    [-halfWidth, 0],
    [halfWidth, 0],
    [-halfWidth, -halfLength],
    [halfWidth, -halfLength],
  ]

  return (
    <group>
      {rails.map(({ position, size }, index) => (
        <mesh key={index} position={position} castShadow>
          <boxGeometry args={size} />
          <Surface color={HANDRAIL_COLOR} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {posts.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, RAIL_HEIGHT / 2, z]} castShadow>
          <boxGeometry args={[RAIL_THICKNESS, RAIL_HEIGHT, RAIL_THICKNESS]} />
          <Surface color={HANDRAIL_COLOR} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
    </group>
  )
}
