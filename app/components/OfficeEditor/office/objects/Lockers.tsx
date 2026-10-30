import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 1.4
const DEPTH = 0.4
const HEIGHT = 1.7
const DOORS = 4

/** A bank of four tall lockers, each with a vent strip and a handle. */
export const Lockers = ({ color = "#5f7d9a" }: Props) => {
  const doorWidth = WIDTH / DOORS
  return (
    <group>
      {/* Carcass */}
      <RoundedBox
        args={[WIDTH, HEIGHT, DEPTH]}
        radius={0.03}
        smoothness={4}
        position={[0, HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.55} metalness={0.15} />
      </RoundedBox>
      {Array.from({ length: DOORS }, (_, i) => {
        const x = -WIDTH / 2 + doorWidth * (i + 0.5)
        return (
          <group key={i} position={[x, HEIGHT / 2, DEPTH / 2]}>
            {/* Door face */}
            <RoundedBox
              args={[doorWidth - 0.05, HEIGHT - 0.06, 0.03]}
              radius={0.02}
              smoothness={3}
              position={[0, 0, 0.005]}
              castShadow
            >
              <Surface color={color} roughness={0.5} metalness={0.2} />
            </RoundedBox>
            {/* Vent slots near the top */}
            {[0, 1, 2].map((slot) => (
              <mesh key={slot} position={[0, HEIGHT / 2 - 0.16 - slot * 0.06, 0.03]}>
                <boxGeometry args={[doorWidth * 0.5, 0.02, 0.02]} />
                <Surface color={PALETTE.seatLeg} roughness={0.6} />
              </mesh>
            ))}
            {/* Handle */}
            <mesh position={[doorWidth * 0.28, -0.1, 0.04]} castShadow>
              <boxGeometry args={[0.03, 0.14, 0.03]} />
              <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
