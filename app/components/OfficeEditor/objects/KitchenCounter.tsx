import { ACCENT, PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { FruitBowl } from "./props"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const WIDTH = 1.96
const DEPTH = 0.62
const HEIGHT = 0.88
const TOP = 0.05
/** Footprint is 2 × 1 m; the counter sits against the back (−Z) edge, like it's on a wall. */
const CENTRE_Z = -0.5 + DEPTH / 2

/**
 * A kitchen counter run: base cabinets, a stone worktop, an inset sink with a
 * tap, and a coffee machine with a little glowing display. Front faces +Z.
 */
export const KitchenCounter = ({ color = "#d9cbb4" }: Props) => {
  const doors = [-0.735, -0.245, 0.245, 0.735]
  return (
    <group position={[0, 0, CENTRE_Z]}>
      {/* Base cabinets */}
      <RoundedBox
        args={[WIDTH, HEIGHT - TOP, DEPTH - 0.04]}
        radius={0.02}
        smoothness={3}
        position={[0, (HEIGHT - TOP) / 2, -0.02]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.75} />
      </RoundedBox>
      {/* Toe kick */}
      <mesh position={[0, 0.05, DEPTH / 2 - 0.06]}>
        <boxGeometry args={[WIDTH - 0.02, 0.1, 0.02]} />
        <Surface color={PALETTE.seatLeg} roughness={0.8} />
      </mesh>
      {/* Cabinet doors + handles */}
      {doors.map((x) => (
        <group key={x} position={[x, (HEIGHT - TOP) / 2 + 0.03, DEPTH / 2 - 0.035]}>
          <RoundedBox
            args={[0.46, HEIGHT - TOP - 0.2, 0.02]}
            radius={0.01}
            smoothness={2}
            castShadow
          >
            <Surface color={color} roughness={0.65} />
          </RoundedBox>
          <mesh position={[0, 0.22, 0.02]}>
            <boxGeometry args={[0.16, 0.02, 0.02]} />
            <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Worktop */}
      <RoundedBox
        args={[WIDTH + 0.04, TOP, DEPTH + 0.02]}
        radius={0.015}
        smoothness={2}
        position={[0, HEIGHT - TOP / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color="#cfd3d8" roughness={0.35} />
      </RoundedBox>
      {/* Sink basin (inset) + tap */}
      <mesh position={[0.35, HEIGHT - 0.004, 0.02]}>
        <boxGeometry args={[0.46, 0.012, 0.36]} />
        <Surface color="#8f9aa6" roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh position={[0.35, HEIGHT + 0.12, -DEPTH / 2 + 0.1]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.24, 12]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh
        position={[0.35, HEIGHT + 0.23, -DEPTH / 2 + 0.17]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.016, 0.016, 0.16, 12]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>
      {/* Coffee machine */}
      <group position={[-0.62, HEIGHT, -0.06]}>
        <RoundedBox
          args={[0.3, 0.36, 0.3]}
          radius={0.03}
          smoothness={3}
          position={[0, 0.18, 0]}
          castShadow
        >
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.27, 0.152]}>
          <planeGeometry args={[0.14, 0.05]} />
          <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} roughness={0.4} />
        </mesh>
        {/* Mug */}
        <mesh position={[0, 0.05, 0.1]} castShadow>
          <cylinderGeometry args={[0.035, 0.03, 0.08, 14]} />
          <Surface color="#f0e2c0" roughness={0.5} />
        </mesh>
      </group>
      {/* Lived-in: a fruit bowl */}
      <FruitBowl position={[-0.12, HEIGHT, 0.06]} />
    </group>
  )
}
