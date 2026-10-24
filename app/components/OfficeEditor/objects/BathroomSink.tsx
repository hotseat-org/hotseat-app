import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"

interface Props {
  /** Vanity cabinet colour. */
  color?: string
}

const W = 0.84
const D = 0.44
const H = 0.82
/** Footprint is 1 × 0.5 m; the vanity sits against the back (−Z) edge. */
const Z = -0.25 + D / 2

/**
 * A washbasin: a vanity cabinet with two doors, a white bowl on the top, a
 * chrome tap, and a mirror on the wall behind. Faces +Z.
 */
export const BathroomSink = ({ color = "#6d7f99" }: Props) => (
  <group position={[0, 0, Z]}>
    <RoundedBox
      args={[W, H - 0.1, D]}
      radius={0.02}
      smoothness={3}
      position={[0, 0.1 + (H - 0.1) / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.6} />
    </RoundedBox>
    {/* Slim legs */}
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => (
        <mesh key={`${sx},${sz}`} position={[sx * (W / 2 - 0.05), 0.05, sz * (D / 2 - 0.05)]}>
          <cylinderGeometry args={[0.015, 0.015, 0.1, 8]} />
          <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
        </mesh>
      ))
    )}
    {[-1, 1].map((side) => (
      <group key={side} position={[side * (W / 4), 0.1 + (H - 0.1) / 2, D / 2]}>
        <RoundedBox args={[W / 2 - 0.03, H - 0.16, 0.02]} radius={0.008} smoothness={2}>
          <Surface color={color} roughness={0.5} />
        </RoundedBox>
        <mesh position={[-side * (W / 4 - 0.06), 0.18, 0.02]}>
          <boxGeometry args={[0.02, 0.12, 0.02]} />
          <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
        </mesh>
      </group>
    ))}
    {/* Top + vessel bowl */}
    <RoundedBox
      args={[W + 0.02, 0.03, D + 0.02]}
      radius={0.01}
      smoothness={2}
      position={[0, H + 0.015, 0]}
      castShadow
      receiveShadow
    >
      <Surface color="#e8e4dc" roughness={0.3} />
    </RoundedBox>
    <mesh position={[0, H + 0.08, 0.03]} scale={[1, 1, 0.8]} castShadow>
      <cylinderGeometry args={[0.2, 0.15, 0.1, 28]} />
      <Surface color="#f3f1ec" roughness={0.2} />
    </mesh>
    {/* Tap */}
    <mesh position={[0, H + 0.14, -D / 2 + 0.07]} castShadow>
      <cylinderGeometry args={[0.014, 0.018, 0.22, 10]} />
      <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
    </mesh>
    <mesh position={[0, H + 0.24, -D / 2 + 0.13]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.12, 10]} />
      <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
    </mesh>
    {/* Mirror on the wall behind */}
    <RoundedBox
      args={[W - 0.1, 0.5, 0.025]}
      radius={0.012}
      smoothness={2}
      position={[0, H + 0.52, -D / 2 + 0.013]}
      castShadow
    >
      <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.3} />
    </RoundedBox>
    <mesh position={[0, H + 0.52, -D / 2 + 0.027]}>
      <planeGeometry args={[W - 0.14, 0.46]} />
      <Surface color="#d6e6ee" roughness={0.08} metalness={0.5} />
    </mesh>
  </group>
)
