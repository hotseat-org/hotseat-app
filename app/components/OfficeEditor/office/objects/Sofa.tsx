import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { FLUSH_INSET } from "../../objects/dimensions"
import { Surface } from "../../objects/Surface"
import { Cushion, Throw } from "./props"
import { look } from "./looks"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 2.0
const DEPTH = 0.9
const SEAT = 0.4

/** Cushion colours (and throw, if any) per look. */
const SOFA_LOOKS: [string, string, string?][] = [
  ["#e8c07a", "#f3e4d0", "#b96f6f"],
  ["#6d90c9", "#e9876a"],
  ["#f3e4d0", "#f3e4d0", "#5f8a86"],
]

/** A two-seat couch: base, cushions, backrest, armrests, little feet. */
export const Sofa = ({ color = "#5f8a86", variant }: Props) => {
  const feet: [number, number][] = [
    [-WIDTH / 2 + 0.14, -DEPTH / 2 + 0.14],
    [WIDTH / 2 - 0.14, -DEPTH / 2 + 0.14],
    [-WIDTH / 2 + 0.14, DEPTH / 2 - 0.14],
    [WIDTH / 2 - 0.14, DEPTH / 2 - 0.14],
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
      {/* Seat cushions */}
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[WIDTH / 2 - 0.26, 0.12, DEPTH - 0.3]}
          radius={0.05}
          smoothness={4}
          position={[side * (WIDTH / 4 - 0.03), SEAT + 0.14, 0.06]}
          castShadow
        >
          <Surface color={color} roughness={0.9} />
        </RoundedBox>
      ))}
      {/* Backrest */}
      <RoundedBox
        args={[WIDTH - 2 * FLUSH_INSET, 0.5, 0.18]}
        radius={0.08}
        smoothness={4}
        position={[0, SEAT + 0.33, -DEPTH / 2 + 0.09 + FLUSH_INSET]}
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
          <cylinderGeometry args={[0.04, 0.04, 0.08, 10]} />
          <Surface color={PALETTE.seatLeg} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Lived-in: cushions (and maybe a throw); colours per look */}
      {(() => {
        const [firstColor, secondColor, throwColor] = SOFA_LOOKS[look(variant, SOFA_LOOKS.length)]
        return (
          <>
            <Cushion
              color={firstColor}
              position={[-WIDTH / 2 + 0.38, SEAT + 0.2, -DEPTH / 2 + 0.3]}
              turn={0.25}
            />
            <Cushion
              color={secondColor}
              position={[WIDTH / 2 - 0.4, SEAT + 0.2, -DEPTH / 2 + 0.3]}
              turn={-0.2}
            />
            {throwColor && (
              <Throw color={throwColor} position={[WIDTH / 2 - 0.09, SEAT + 0.3, 0.05]} />
            )}
          </>
        )
      })()}
    </group>
  )
}
