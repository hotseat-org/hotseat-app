import { useMemo } from "react"
import { getStairsWalledSides, type StairsSides } from "../floorLinks"
import { GRID } from "../types"
import { shade } from "../plan/shapes"
import { Surface } from "./Surface"
import { STOREY } from "./dimensions"
import { useFloorPieces, usePiece } from "./pieceContext"

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

/** No side along a wall: every rail drawn (a thumbnail, or stairs standing free). */
const OPEN_SIDES: StairsSides = { left: false, right: false, foot: false }

interface Props {
  color?: string
}

/** A box of the rails' metal. */
const RailPart = ({
  position,
  size,
  rotation,
}: {
  position: [number, number, number]
  size: [number, number, number]
  rotation?: [number, number, number]
}) => (
  <mesh position={position} rotation={rotation} castShadow>
    <boxGeometry args={size} />
    <Surface color={HANDRAIL_COLOR} roughness={0.5} metalness={0.3} />
  </mesh>
)

/** Which of the drawn stairs' sides run along a wall on their floor. */
const useWalledSides = () => {
  const stairs = usePiece()
  const pieces = useFloorPieces()

  return useMemo(
    () => (stairs && pieces ? getStairsWalledSides(stairs, pieces) : OPEN_SIDES),
    [stairs, pieces]
  )
}

/**
 * Stairs up a storey: eight treads rising from the front (+Z, the foot) to
 * the back, where they reach the floor above; a stringer along each side,
 * and a handrail where there's no wall beside them.
 */
export const Stairs = ({ color = "#c9b79c" }: Props) => {
  const walledSides = useWalledSides()
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
      {([-1, 1] as const).map((side) => (
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
          {/* The handrail, on posts at the foot and the top — none along a wall. */}
          {!walledSides[side < 0 ? "left" : "right"] && (
            <>
              <RailPart
                position={[0, STOREY / 2 + RAIL_HEIGHT, 0]}
                rotation={[slope, 0, 0]}
                size={[RAIL_THICKNESS, RAIL_THICKNESS, railLength]}
              />
              <RailPart
                position={[0, STEP_RISE + RAIL_HEIGHT / 2, STAIRS.length / 2 - STEP_RUN / 2]}
                size={[RAIL_THICKNESS, RAIL_HEIGHT, RAIL_THICKNESS]}
              />
              <RailPart
                position={[0, STOREY + RAIL_HEIGHT / 2, -STAIRS.length / 2 + STEP_RUN / 2]}
                size={[RAIL_THICKNESS, RAIL_HEIGHT, RAIL_THICKNESS]}
              />
            </>
          )}
        </group>
      ))}
    </group>
  )
}

/**
 * On the floor above stairs: a guard rail round the opening they come up
 * through — along both sides and across the foot, open at the back, where
 * the stairs arrive; none along a wall (`walledSides`, the floor above's).
 * In the stairs' own frame.
 */
export const StairsLanding = ({ walledSides }: { walledSides: StairsSides }) => {
  const halfWidth = STAIRS.width / 2
  const halfLength = STAIRS.length / 2
  const sideRail: [number, number, number] = [RAIL_THICKNESS, RAIL_THICKNESS, STAIRS.length]
  // A post wherever a rail ends, or two meet.
  const posts: [number, number][] = [
    ...(walledSides.left
      ? []
      : ([
          [-halfWidth, 0],
          [-halfWidth, -halfLength],
        ] as const)),
    ...(walledSides.right
      ? []
      : ([
          [halfWidth, 0],
          [halfWidth, -halfLength],
        ] as const)),
    ...(walledSides.left && walledSides.foot ? [] : ([[-halfWidth, halfLength]] as const)),
    ...(walledSides.right && walledSides.foot ? [] : ([[halfWidth, halfLength]] as const)),
  ].map(([x, z]) => [x, z])

  return (
    <group>
      {!walledSides.left && <RailPart position={[-halfWidth, RAIL_HEIGHT, 0]} size={sideRail} />}
      {!walledSides.right && <RailPart position={[halfWidth, RAIL_HEIGHT, 0]} size={sideRail} />}
      {!walledSides.foot && (
        <RailPart
          position={[0, RAIL_HEIGHT, halfLength]}
          size={[STAIRS.width, RAIL_THICKNESS, RAIL_THICKNESS]}
        />
      )}
      {posts.map(([x, z]) => (
        <RailPart
          key={`${x}:${z}`}
          position={[x, RAIL_HEIGHT / 2, z]}
          size={[RAIL_THICKNESS, RAIL_HEIGHT, RAIL_THICKNESS]}
        />
      ))}
    </group>
  )
}
