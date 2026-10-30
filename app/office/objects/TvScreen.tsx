import { ACCENT, PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 1.4
const DEPTH = 0.36
const CONSOLE_H = 0.42

/** A wall display on a low media console; the screen faces +Z. */
export const TvScreen = ({ color = PALETTE.deskLeg }: Props) => (
  <group>
    {/* Media console */}
    <RoundedBox
      args={[WIDTH, CONSOLE_H, DEPTH]}
      radius={0.03}
      smoothness={4}
      position={[0, CONSOLE_H / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.6} />
    </RoundedBox>
    {/* Console doors */}
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * WIDTH * 0.24, CONSOLE_H / 2, DEPTH / 2 - 0.005]}>
        <boxGeometry args={[WIDTH * 0.42, CONSOLE_H - 0.1, 0.02]} />
        <Surface color={PALETTE.deskTop} roughness={0.6} />
      </mesh>
    ))}
    {/* Screen bezel */}
    <RoundedBox
      args={[WIDTH * 0.82, 0.66, 0.05]}
      radius={0.02}
      smoothness={3}
      position={[0, CONSOLE_H + 0.42, DEPTH / 2 - 0.06]}
      castShadow
    >
      <Surface color="#20242e" roughness={0.5} />
    </RoundedBox>
    {/* Glowing screen */}
    <mesh position={[0, CONSOLE_H + 0.42, DEPTH / 2 - 0.03]}>
      <planeGeometry args={[WIDTH * 0.74, 0.56]} />
      <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} roughness={0.3} />
    </mesh>
  </group>
)
