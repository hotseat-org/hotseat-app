import { GRID } from "../types"
import { shade } from "../plan/shapes"
import { Surface } from "./Surface"
import { STOREY } from "./dimensions"

/** The lift's size (world units): three squares each way. */
export const LIFT = { size: 3 * GRID }

const SHAFT_WALL = 0.08
const DOOR_WIDTH = 0.8
const DOOR_HEIGHT = 1.02
const DOOR_COLOR = "#b9c2cf"

interface Props {
  color?: string
}

/**
 * A lift on one floor: its shaft, a storey high — back and sides, and the
 * front with the sliding doors in a frame, a call button beside them. The
 * same on every floor it serves.
 */
export const Lift = ({ color = "#8e99a8" }: Props) => {
  const half = LIFT.size / 2
  const sideWidth = (LIFT.size - DOOR_WIDTH) / 2
  const frameColor = shade(color, 0.8)

  return (
    <group>
      {/* Back and sides. */}
      {[
        {
          position: [0, STOREY / 2, -half + SHAFT_WALL / 2],
          size: [LIFT.size, STOREY, SHAFT_WALL],
        },
        {
          position: [-half + SHAFT_WALL / 2, STOREY / 2, 0],
          size: [SHAFT_WALL, STOREY, LIFT.size],
        },
        { position: [half - SHAFT_WALL / 2, STOREY / 2, 0], size: [SHAFT_WALL, STOREY, LIFT.size] },
      ].map(({ position, size }, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={size as [number, number, number]} />
          <Surface color={color} roughness={0.7} />
        </mesh>
      ))}
      {/* The front: beside the doors, and over them. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (half - sideWidth / 2), STOREY / 2, half - SHAFT_WALL / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[sideWidth, STOREY, SHAFT_WALL]} />
          <Surface color={color} roughness={0.7} />
        </mesh>
      ))}
      <mesh
        position={[0, (DOOR_HEIGHT + STOREY) / 2, half - SHAFT_WALL / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[DOOR_WIDTH, STOREY - DOOR_HEIGHT, SHAFT_WALL]} />
        <Surface color={color} roughness={0.7} />
      </mesh>
      {/* The doors, closed, a hair inside the frame, meeting in the middle. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * DOOR_WIDTH) / 4, DOOR_HEIGHT / 2, half - SHAFT_WALL / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[DOOR_WIDTH / 2 - 0.01, DOOR_HEIGHT, SHAFT_WALL * 0.6]} />
          <Surface color={DOOR_COLOR} roughness={0.35} metalness={0.4} />
        </mesh>
      ))}
      {/* The frame round the doors. */}
      <mesh position={[0, DOOR_HEIGHT + 0.025, half + 0.005]} castShadow>
        <boxGeometry args={[DOOR_WIDTH + 0.1, 0.05, SHAFT_WALL]} />
        <Surface color={frameColor} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (DOOR_WIDTH / 2 + 0.025), DOOR_HEIGHT / 2, half + 0.005]}
          castShadow
        >
          <boxGeometry args={[0.05, DOOR_HEIGHT, SHAFT_WALL]} />
          <Surface color={frameColor} roughness={0.5} />
        </mesh>
      ))}
      {/* The call button. */}
      <mesh position={[DOOR_WIDTH / 2 + 0.14, 0.52, half + 0.01]}>
        <boxGeometry args={[0.07, 0.12, 0.02]} />
        <Surface color="#e7ecf2" emissive="#ffd27a" emissiveIntensity={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}
