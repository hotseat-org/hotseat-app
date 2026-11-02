import { Mug } from "../props"
import { PALETTE } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  /** The cabinet's colour. */
  color?: string
}

const WIDTH = 0.96
const DEPTH = 0.6
const COUNTER = 0.9
const STEEL = "#b9bcc4"
const DARK = "#2c313c"

/**
 * A coffee corner: a cabinet with an espresso machine, a grinder, a row of
 * mugs and a jar of beans on top.
 */
export const CoffeeStation = ({ color = "#3d4657" }: Props) => (
  <group position={[0, 0, -0.5 + DEPTH / 2]}>
    {/* Cabinet and its top */}
    <mesh position={[0, (COUNTER - 0.04) / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH, COUNTER - 0.04, DEPTH - 0.04]} />
      <Surface color={color} roughness={0.6} />
    </mesh>
    <mesh position={[0, COUNTER - 0.02, 0]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH + 0.02, 0.04, DEPTH]} />
      <Surface color={PALETTE.deskTop} roughness={0.5} />
    </mesh>
    {/* Doors' split and handles */}
    <mesh position={[0, COUNTER / 2, DEPTH / 2 - 0.018]}>
      <boxGeometry args={[0.01, COUNTER - 0.16, 0.004]} />
      <Surface color={DARK} roughness={0.6} />
    </mesh>
    {[-0.06, 0.06].map((x) => (
      <mesh key={x} position={[x, COUNTER - 0.16, DEPTH / 2 - 0.01]}>
        <boxGeometry args={[0.015, 0.12, 0.02]} />
        <Surface color={STEEL} roughness={0.3} metalness={0.6} />
      </mesh>
    ))}
    <group position={[0, COUNTER, 0]}>
      {/* Espresso machine: body, drip tray, group head and its little cup */}
      <RoundedBox
        args={[0.36, 0.36, 0.36]}
        radius={0.03}
        smoothness={3}
        position={[-0.18, 0.18, -0.06]}
        castShadow
      >
        <Surface color={STEEL} roughness={0.25} metalness={0.7} />
      </RoundedBox>
      <mesh position={[-0.18, 0.03, 0.15]}>
        <boxGeometry args={[0.3, 0.04, 0.1]} />
        <Surface color={DARK} roughness={0.5} />
      </mesh>
      <mesh position={[-0.18, 0.22, 0.14]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 12]} />
        <Surface color={DARK} roughness={0.4} metalness={0.4} />
      </mesh>
      <Mug position={[-0.18, 0.05, 0.15]} hot />
      {/* Grinder: bean hopper over a dark base */}
      <mesh position={[0.12, 0.1, -0.1]} castShadow>
        <boxGeometry args={[0.13, 0.2, 0.16]} />
        <Surface color={DARK} roughness={0.5} />
      </mesh>
      <mesh position={[0.12, 0.27, -0.1]} castShadow>
        <cylinderGeometry args={[0.07, 0.04, 0.14, 12]} />
        <Surface color="#6b4a33" roughness={0.6} />
      </mesh>
      {/* Mugs in a row, and a jar of beans */}
      {["#c9564f", "#f3f1ec", "#6d90c9"].map((mugColor, i) => (
        <Mug key={mugColor} color={mugColor} position={[0.1 + i * 0.1, 0, 0.15]} />
      ))}
      <mesh position={[0.36, 0.08, -0.12]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.16, 12]} />
        <Surface color="#6b4a33" roughness={0.6} />
      </mesh>
    </group>
  </group>
)
