import { RoundedBox } from "@react-three/drei"
import { ACCENT, PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 0.74
const D = 0.62
const H = 1.7

const ITEM_COLORS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0"]

/** A snack/drink vending machine: body, lit glass front stocked with items, and a slot. */
export const VendingMachine = ({ color = "#c9564f" }: Props) => (
  <group>
    {/* Body */}
    <RoundedBox
      args={[W, H, D]}
      radius={0.04}
      smoothness={4}
      position={[0, H / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.45} metalness={0.1} />
    </RoundedBox>
    {/* Glass window */}
    <RoundedBox
      args={[W * 0.62, H * 0.66, 0.04]}
      radius={0.02}
      smoothness={3}
      position={[-W * 0.08, H * 0.58, D / 2 - 0.01]}
      castShadow
    >
      <Surface color="#20242e" roughness={0.25} metalness={0.1} />
    </RoundedBox>
    {/* Stocked items behind the glass */}
    {[0, 1, 2, 3].map((row) =>
      ITEM_COLORS.map((c, col) => (
        <mesh
          key={`${row}-${col}`}
          position={[-W * 0.08 - W * 0.22 + col * (W * 0.11), H * 0.3 + row * 0.24, D / 2 - 0.02]}
        >
          <boxGeometry args={[0.07, 0.12, 0.02]} />
          <Surface color={c} roughness={0.7} />
        </mesh>
      ))
    )}
    {/* Control column */}
    <RoundedBox
      args={[W * 0.2, H * 0.5, 0.03]}
      radius={0.01}
      smoothness={3}
      position={[W * 0.32, H * 0.62, D / 2 - 0.005]}
    >
      <Surface color={PALETTE.seatLeg} roughness={0.5} />
    </RoundedBox>
    {/* Keypad glow */}
    <mesh position={[W * 0.32, H * 0.74, D / 2 + 0.01]}>
      <planeGeometry args={[W * 0.14, 0.1]} />
      <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} roughness={0.4} />
    </mesh>
    {/* Dispensing slot */}
    <mesh position={[-W * 0.08, 0.16, D / 2 - 0.005]}>
      <boxGeometry args={[W * 0.5, 0.14, 0.03]} />
      <Surface color="#20242e" roughness={0.7} />
    </mesh>
  </group>
)
