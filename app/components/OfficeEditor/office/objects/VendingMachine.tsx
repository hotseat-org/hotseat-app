import { ACCENT, PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 0.74
const DEPTH = 0.62
const HEIGHT = 1.7

const ITEM_COLORS = ["#b96f6f", "#6d90c9", "#7fa66a", "#e8c07a", "#8b7fb0"]

/** A snack/drink vending machine: body, lit glass front stocked with items, and a slot. */
export const VendingMachine = ({ color = "#c9564f" }: Props) => (
  <group>
    {/* Body */}
    <RoundedBox
      args={[WIDTH, HEIGHT, DEPTH]}
      radius={0.04}
      smoothness={4}
      position={[0, HEIGHT / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.45} metalness={0.1} />
    </RoundedBox>
    {/* Glass window */}
    <RoundedBox
      args={[WIDTH * 0.62, HEIGHT * 0.66, 0.04]}
      radius={0.02}
      smoothness={3}
      position={[-WIDTH * 0.08, HEIGHT * 0.58, DEPTH / 2 - 0.01]}
      castShadow
    >
      <Surface color="#20242e" roughness={0.25} metalness={0.1} />
    </RoundedBox>
    {/* Stocked items behind the glass */}
    {[0, 1, 2, 3].map((row) =>
      ITEM_COLORS.map((itemColor, column) => (
        <mesh
          key={`${row}-${column}`}
          position={[
            -WIDTH * 0.08 - WIDTH * 0.22 + column * (WIDTH * 0.11),
            HEIGHT * 0.3 + row * 0.24,
            DEPTH / 2 - 0.02,
          ]}
        >
          <boxGeometry args={[0.07, 0.12, 0.02]} />
          <Surface color={itemColor} roughness={0.7} />
        </mesh>
      ))
    )}
    {/* Control column */}
    <RoundedBox
      args={[WIDTH * 0.2, HEIGHT * 0.5, 0.03]}
      radius={0.01}
      smoothness={3}
      position={[WIDTH * 0.32, HEIGHT * 0.62, DEPTH / 2 - 0.005]}
    >
      <Surface color={PALETTE.seatLeg} roughness={0.5} />
    </RoundedBox>
    {/* Keypad glow */}
    <mesh position={[WIDTH * 0.32, HEIGHT * 0.74, DEPTH / 2 + 0.01]}>
      <planeGeometry args={[WIDTH * 0.14, 0.1]} />
      <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} roughness={0.4} />
    </mesh>
    {/* Dispensing slot */}
    <mesh position={[-WIDTH * 0.08, 0.16, DEPTH / 2 - 0.005]}>
      <boxGeometry args={[WIDTH * 0.5, 0.14, 0.03]} />
      <Surface color="#20242e" roughness={0.7} />
    </mesh>
  </group>
)
