import { WALL_FACE } from "../wallItem"
import { PALETTE } from "~/editor/core"
import { Surface } from "~/editor/kit"

interface Props {
  /** The moss. */
  color?: string
}

const WIDTH = 1.8
const HEIGHT = 0.8
const HANG_HEIGHT = 0.8
const FRAME = 0.04

/** Tufts over the moss (x, y, size, darker?), so it's bumpy rather than flat. */
const TUFTS: [number, number, number, boolean][] = [
  [-0.7, 0.2, 0.09, false],
  [-0.52, -0.15, 0.11, true],
  [-0.3, 0.1, 0.08, false],
  [-0.12, -0.22, 0.09, false],
  [0.02, 0.18, 0.12, true],
  [0.24, -0.05, 0.1, false],
  [0.42, 0.22, 0.08, true],
  [0.55, -0.2, 0.1, false],
  [0.72, 0.05, 0.09, true],
  [-0.78, -0.24, 0.07, true],
]

/** A preserved-moss panel in a wooden frame: green and soft, no watering needed. */
export const MossWall = ({ color = "#6b9159" }: Props) => (
  <group position={[0, HANG_HEIGHT, WALL_FACE]}>
    {/* Frame: the sides fit between the top and bottom bars (no shared faces to flicker) */}
    {[
      [0, HEIGHT / 2 - FRAME / 2, WIDTH, FRAME],
      [0, -HEIGHT / 2 + FRAME / 2, WIDTH, FRAME],
      [-WIDTH / 2 + FRAME / 2, 0, FRAME, HEIGHT - FRAME * 2],
      [WIDTH / 2 - FRAME / 2, 0, FRAME, HEIGHT - FRAME * 2],
    ].map(([x, y, width, height], i) => (
      <mesh key={i} position={[x, y, 0.04]} castShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <Surface color={PALETTE.deskTop} roughness={0.6} />
      </mesh>
    ))}
    {/* The moss bed */}
    <mesh position={[0, 0, 0.03]}>
      <boxGeometry args={[WIDTH - FRAME * 2, HEIGHT - FRAME * 2, 0.06]} />
      <Surface color={color} roughness={1} />
    </mesh>
    {TUFTS.map(([x, y, size, isDarker], i) => (
      <mesh key={i} position={[x, y, 0.06]} scale={[1, 1, 0.5]}>
        <icosahedronGeometry args={[size, 0]} />
        <Surface
          color={isDarker ? PALETTE.plantLeafDark : PALETTE.plantLeaf}
          roughness={1}
          flatShading
        />
      </mesh>
    ))}
  </group>
)
