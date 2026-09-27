import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 0.72
const D = 0.66
const H = 1.86
/** Footprint is 1 × 1 m; the fridge stands against the back (−Z) edge. */
const Z = -0.5 + D / 2
/** Height of the split between the freezer (bottom) and fridge (top) doors. */
const SPLIT = 0.62

/** A tall fridge-freezer: body, two doors with long handles. Front faces +Z. */
export const Fridge = ({ color = "#e8edf2" }: Props) => (
  <group position={[0, 0, Z]}>
    <RoundedBox
      args={[W, H, D - 0.04]}
      radius={0.05}
      smoothness={4}
      position={[0, H / 2, -0.02]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.4} metalness={0.1} />
    </RoundedBox>
    {/* Freezer door (bottom) + fridge door (top), with a small gap between */}
    {[
      [0.02, SPLIT - 0.01],
      [SPLIT + 0.01, H - 0.02],
    ].map(([y0, y1]) => (
      <RoundedBox
        key={y0}
        args={[W - 0.02, y1 - y0, 0.04]}
        radius={0.03}
        smoothness={3}
        position={[0, (y0 + y1) / 2, D / 2 - 0.03]}
        castShadow
      >
        <Surface color={color} roughness={0.35} metalness={0.1} />
      </RoundedBox>
    ))}
    {/* Handles */}
    {[
      [SPLIT + 0.22, 0.5],
      [SPLIT - 0.24, 0.3],
    ].map(([y, len]) => (
      <mesh key={y} position={[W / 2 - 0.08, y, D / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.03, len, 0.03]} />
        <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.5} />
      </mesh>
    ))}
  </group>
)
