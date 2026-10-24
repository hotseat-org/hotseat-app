import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 1.42
const D = 0.58
const H = 1.72
const PLINTH = 0.08
/** Footprint is 1.5 × 1 m; the wardrobe stands against the back (−Z) edge. */
const Z = -0.5 + D / 2

/** A tall two-door wardrobe on a dark plinth, with long bar handles. Front faces +Z. */
export const Wardrobe = ({ color = "#c9a27e" }: Props) => {
  const doorW = W / 2 - 0.03
  return (
    <group position={[0, 0, Z]}>
      <mesh position={[0, PLINTH / 2, 0.01]} receiveShadow>
        <boxGeometry args={[W - 0.06, PLINTH, D - 0.08]} />
        <Surface color={PALETTE.seatLeg} roughness={0.8} />
      </mesh>
      {/* Carcass */}
      <RoundedBox
        args={[W, H - PLINTH, D]}
        radius={0.025}
        smoothness={3}
        position={[0, PLINTH + (H - PLINTH) / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.7} />
      </RoundedBox>
      {/* Doors, a hairline apart, with bar handles by the centre */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (W / 4), PLINTH + (H - PLINTH) / 2, D / 2]}>
          <RoundedBox
            args={[doorW, H - PLINTH - 0.05, 0.03]}
            radius={0.012}
            smoothness={2}
            castShadow
          >
            <Surface color={color} roughness={0.6} />
          </RoundedBox>
          <mesh position={[-side * (doorW / 2 - 0.07), 0.05, 0.035]} castShadow>
            <boxGeometry args={[0.025, 0.42, 0.025]} />
            <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
