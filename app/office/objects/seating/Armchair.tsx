import { Cushion } from "../props"
import { look } from "../looks"
import { PALETTE, FLUSH_INSET } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 0.92
const DEPTH = 0.86
const SEAT = 0.4

/** A single-seat lounge armchair in the Sofa's style. Front faces +Z. */
export const Armchair = ({ color = "#c0876a", variant }: Props) => {
  const feet: [number, number][] = [
    [-WIDTH / 2 + 0.12, -DEPTH / 2 + 0.12],
    [WIDTH / 2 - 0.12, -DEPTH / 2 + 0.12],
    [-WIDTH / 2 + 0.12, DEPTH / 2 - 0.12],
    [WIDTH / 2 - 0.12, DEPTH / 2 - 0.12],
  ]

  return (
    <group>
      {/* Seat base */}
      <RoundedBox
        // Inset from the armrests' faces (see FLUSH_INSET).
        args={[WIDTH - 2 * FLUSH_INSET, SEAT, DEPTH - 2 * FLUSH_INSET]}
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
        args={[WIDTH - 0.36, 0.12, DEPTH - 0.3]}
        radius={0.05}
        smoothness={4}
        position={[0, SEAT + 0.14, 0.06]}
        castShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Backrest (a little taller than the sofa's — it's a lounge chair) */}
      <RoundedBox
        args={[WIDTH - 2 * FLUSH_INSET, 0.58, 0.18]}
        radius={0.08}
        smoothness={4}
        position={[0, SEAT + 0.37, -DEPTH / 2 + 0.09 + FLUSH_INSET]}
        castShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Armrests */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[0.18, SEAT + 0.22, DEPTH]}
          radius={0.08}
          smoothness={4}
          position={[side * (WIDTH / 2 - 0.09), (SEAT + 0.22) / 2 + 0.08, 0]}
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
        position={[0, SEAT + 0.2, -DEPTH / 2 + 0.3]}
        turn={0.15}
      />
    </group>
  )
}
