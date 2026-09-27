import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 1.4
const D = 0.4
const H = 1.7
const DOORS = 4

/** A bank of four tall lockers, each with a vent strip and a handle. */
export const Lockers = ({ color = "#5f7d9a" }: Props) => {
  const dw = W / DOORS
  return (
    <group>
      {/* Carcass */}
      <RoundedBox
        args={[W, H, D]}
        radius={0.03}
        smoothness={4}
        position={[0, H / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.55} metalness={0.15} />
      </RoundedBox>
      {Array.from({ length: DOORS }, (_, i) => {
        const x = -W / 2 + dw * (i + 0.5)
        return (
          <group key={i} position={[x, H / 2, D / 2]}>
            {/* Door face */}
            <RoundedBox
              args={[dw - 0.05, H - 0.06, 0.03]}
              radius={0.02}
              smoothness={3}
              position={[0, 0, 0.005]}
              castShadow
            >
              <Surface color={color} roughness={0.5} metalness={0.2} />
            </RoundedBox>
            {/* Vent slots near the top */}
            {[0, 1, 2].map((v) => (
              <mesh key={v} position={[0, H / 2 - 0.16 - v * 0.06, 0.03]}>
                <boxGeometry args={[dw * 0.5, 0.02, 0.02]} />
                <Surface color={PALETTE.seatLeg} roughness={0.6} />
              </mesh>
            ))}
            {/* Handle */}
            <mesh position={[dw * 0.28, -0.1, 0.04]} castShadow>
              <boxGeometry args={[0.03, 0.14, 0.03]} />
              <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
