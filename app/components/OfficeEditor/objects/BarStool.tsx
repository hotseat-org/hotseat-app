import { PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const SEAT_Y = 0.74

/** A round bar stool: padded seat, chrome post and footrest ring, weighted base. */
export const BarStool = ({ color = "#d98a63" }: Props) => (
  <group>
    <mesh position={[0, SEAT_Y, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.19, 0.17, 0.08, 24]} />
      <Surface color={color} roughness={0.75} />
    </mesh>
    <mesh position={[0, SEAT_Y / 2, 0]} castShadow>
      <cylinderGeometry args={[0.028, 0.028, SEAT_Y, 12]} />
      <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.14, 0.014, 8, 28]} />
      <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.6} />
    </mesh>
    <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.17, 0.18, 0.03, 24]} />
      <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
    </mesh>
  </group>
)
