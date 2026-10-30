import { PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 0.72
const DEPTH = 0.66
const HEIGHT = 1.86
/** Footprint is 1 × 1 m; the fridge stands against the back (−Z) edge. */
const CENTRE_Z = -0.5 + DEPTH / 2
/** Height of the split between the freezer (bottom) and fridge (top) doors. */
const SPLIT = 0.62

/** A tall fridge-freezer: body, two doors with long handles. Front faces +Z. */
export const Fridge = ({ color = "#e8edf2" }: Props) => (
  <group position={[0, 0, CENTRE_Z]}>
    <RoundedBox
      args={[WIDTH, HEIGHT, DEPTH - 0.04]}
      radius={0.05}
      smoothness={4}
      position={[0, HEIGHT / 2, -0.02]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.4} metalness={0.1} />
    </RoundedBox>
    {/* Freezer door (bottom) + fridge door (top), with a small gap between */}
    {[
      [0.02, SPLIT - 0.01],
      [SPLIT + 0.01, HEIGHT - 0.02],
    ].map(([bottom, top]) => (
      <RoundedBox
        key={bottom}
        args={[WIDTH - 0.02, top - bottom, 0.04]}
        radius={0.03}
        smoothness={3}
        position={[0, (bottom + top) / 2, DEPTH / 2 - 0.03]}
        castShadow
      >
        <Surface color={color} roughness={0.35} metalness={0.1} />
      </RoundedBox>
    ))}
    {/* Handles */}
    {[
      [SPLIT + 0.22, 0.5],
      [SPLIT - 0.24, 0.3],
    ].map(([y, length]) => (
      <mesh key={y} position={[WIDTH / 2 - 0.08, y, DEPTH / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.03, length, 0.03]} />
        <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.5} />
      </mesh>
    ))}
  </group>
)
