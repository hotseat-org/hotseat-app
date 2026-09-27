import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Surface } from "./Surface"
import { SEAT } from "./dimensions"

interface Props {
  color?: string
}

/** A friendly office chair: cushion, backrest, centre post and a wheeled base. */
export const Seat = ({ color = PALETTE.seat }: Props) => {
  const feet: [number, number][] = [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.22],
    [0.22, 0.22],
  ]

  return (
    <group>
      {/* Cushion */}
      <RoundedBox
        args={[SEAT.cushion, SEAT.cushionThickness, SEAT.cushion]}
        radius={0.06}
        smoothness={4}
        position={[0, SEAT.seatHeight, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.8} />
      </RoundedBox>

      {/* Backrest */}
      <RoundedBox
        args={[SEAT.cushion, SEAT.backHeight, 0.12]}
        radius={0.06}
        smoothness={4}
        position={[0, SEAT.seatHeight + SEAT.backHeight / 2, -SEAT.cushion / 2 + 0.06]}
        castShadow
        receiveShadow
      >
        <Surface color={PALETTE.seatDark} roughness={0.8} />
      </RoundedBox>

      {/* Centre post */}
      <mesh position={[0, SEAT.seatHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, SEAT.seatHeight, 16]} />
        <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Wheeled base */}
      {feet.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.05, z]} castShadow>
          <sphereGeometry args={[0.06, 12, 12]} />
          <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
      {feet.map(([x, z]) => (
        <mesh
          key={`spoke-${x},${z}`}
          position={[x / 2, 0.09, z / 2]}
          rotation={[0, Math.atan2(z, x), 0]}
          castShadow
        >
          <boxGeometry args={[0.32, 0.05, 0.05]} />
          <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.2} />
        </mesh>
      ))}
    </group>
  )
}
