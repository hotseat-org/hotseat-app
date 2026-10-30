import { GRID } from "../types"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const HEIGHT = 1
const SLATS = 3
const SLAT_WIDTH = 0.08
const SLAT_THICKNESS = 0.025
const RAIL_HEIGHT = 0.05
const RAIL_DEPTH = 0.035

/**
 * A picket fence segment spanning one grid edge: slats on two rails. Rails
 * run its whole length and the slats sit evenly inside it, so segments line
 * up into one continuous fence with no doubled posts at the joins.
 */
export const Fence = ({ color = "#b08a5e" }: Props) => (
  <group>
    {Array.from({ length: SLATS }, (_, i) => (
      <mesh
        key={i}
        position={[(i + 0.5) * (GRID / SLATS) - GRID / 2, HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[SLAT_WIDTH, HEIGHT, SLAT_THICKNESS]} />
        <Surface color={color} roughness={0.9} />
      </mesh>
    ))}
    {[0.25, 0.75].map((height) => (
      <mesh
        key={height}
        position={[0, HEIGHT * height, -(SLAT_THICKNESS + RAIL_DEPTH) / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[GRID, RAIL_HEIGHT, RAIL_DEPTH]} />
        <Surface color={color} roughness={0.9} />
      </mesh>
    ))}
  </group>
)
