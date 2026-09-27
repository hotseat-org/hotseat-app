import { PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const H = 0.5

/** A small round office bin with a rim and a recycling-band accent. */
export const TrashBin = ({ color = "#5b6577" }: Props) => (
  <group>
    {/* Body (slightly tapered) */}
    <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.16, 0.13, H, 24]} />
      <Surface color={color} roughness={0.5} metalness={0.2} />
    </mesh>
    {/* Rim */}
    <mesh position={[0, H, 0]} castShadow>
      <torusGeometry args={[0.16, 0.018, 12, 24]} />
      <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
    </mesh>
    {/* Accent band */}
    <mesh position={[0, H * 0.62, 0]}>
      <cylinderGeometry args={[0.153, 0.145, 0.07, 24]} />
      <Surface color="#5f8a86" roughness={0.6} />
    </mesh>
  </group>
)
