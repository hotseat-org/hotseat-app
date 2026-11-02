import { Cushion } from "../props"
import { look } from "../looks"
import { FLUSH_INSET, PALETTE } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 2.9
const DEPTH = 0.8
const SEAT = 0.42

/** Cushion colours per look: a row of them along the back. */
const BENCH_LOOKS: string[][] = [
  ["#e8c07a", "#f3e4d0", "#b96f6f", "#f3e4d0"],
  ["#6d90c9", "#f3e4d0", "#e9876a"],
  ["#5f8a86", "#e8c07a", "#5f8a86", "#e8c07a", "#f3e4d0"],
]

/**
 * A long lounge bench, as along a window: a wooden plinth, one long seat pad,
 * a low back to lean on and cushions along it.
 */
export const LoungeBench = ({ color = "#c0876a", variant }: Props) => {
  const cushions = BENCH_LOOKS[look(variant, BENCH_LOOKS.length)]
  const spacing = (WIDTH - 0.5) / cushions.length

  return (
    <group>
      {/* Plinth */}
      <RoundedBox
        args={[WIDTH, SEAT - 0.1, DEPTH]}
        radius={0.03}
        smoothness={2}
        position={[0, (SEAT - 0.1) / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={PALETTE.deskTop} roughness={0.7} />
      </RoundedBox>
      {/* Seat pad */}
      <RoundedBox
        args={[WIDTH - 2 * FLUSH_INSET - 0.04, 0.12, DEPTH - 0.06]}
        radius={0.05}
        smoothness={4}
        position={[0, SEAT - 0.04, 0.02]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {/* Low back */}
      <RoundedBox
        args={[WIDTH, 0.32, 0.14]}
        radius={0.06}
        smoothness={4}
        position={[0, SEAT + 0.16, -DEPTH / 2 + 0.07]}
        castShadow
      >
        <Surface color={color} roughness={0.9} />
      </RoundedBox>
      {cushions.map((cushionColor, i) => (
        <Cushion
          key={i}
          color={cushionColor}
          position={[-WIDTH / 2 + 0.25 + spacing * (i + 0.5), SEAT + 0.04, -DEPTH / 2 + 0.22]}
        />
      ))}
    </group>
  )
}
