import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Cushion } from "./props"
import { look } from "./looks"
import { FLUSH_INSET } from "./dimensions"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const W = 0.92
const D = 0.86
const SEAT = 0.4

/** A single-seat lounge armchair in the Sofa's style. Front faces +Z. */
export const Armchair = ({ color = "#c0876a", variant }: Props) => {
  const feet: [number, number][] = [
    [-W / 2 + 0.12, -D / 2 + 0.12],
    [W / 2 - 0.12, -D / 2 + 0.12],
    [-W / 2 + 0.12, D / 2 - 0.12],
    [W / 2 - 0.12, D / 2 - 0.12],
  ]
  return (
    <group>
      {/* Seat base */}
      <RoundedBox
        // Inset from the armrests' faces (see FLUSH_INSET).
        args={[W - 2 * FLUSH_INSET, SEAT, D - 2 * FLUSH_INSET]}
        radius={0.08}
        smoothness={4}
        position={[0, SEAT / 2 + 0.08, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Seat cushion */}
      <RoundedBox
        args={[W - 0.36, 0.12, D - 0.3]}
        radius={0.05}
        smoothness={4}
        position={[0, SEAT + 0.14, 0.06]}
        castShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Backrest (a little taller than the sofa's — it's a lounge chair) */}
      <RoundedBox
        args={[W - 2 * FLUSH_INSET, 0.58, 0.18]}
        radius={0.08}
        smoothness={4}
        position={[0, SEAT + 0.37, -D / 2 + 0.09 + FLUSH_INSET]}
        castShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Armrests */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[0.18, SEAT + 0.22, D]}
          radius={0.08}
          smoothness={4}
          position={[s * (W / 2 - 0.09), (SEAT + 0.22) / 2 + 0.08, 0]}
          castShadow
        >
          <Surface color={color} roughness={0.9} />
        </RoundedBox>
      ))}
      {/* Feet */}
      {feet.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.04, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.08, 10]} />
          <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Lived-in: a cushion, its colour per look */}
      <Cushion
        color={["#f3e4d0", "#e8c07a", "#6d90c9"][look(variant, 3)]}
        position={[0, SEAT + 0.2, -D / 2 + 0.3]}
        turn={0.15}
      />
    </group>
  )
}
