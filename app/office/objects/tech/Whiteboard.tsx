import { StickyNote } from "../props"
import { PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 1.5
const BOARD_H = 0.9
const BOARD_Y = 0.7 // bottom of the board above the floor

// A few faint marker scribbles so it reads as a whiteboard in use.
const SCRIBBLES: [number, number, number, string][] = [
  [-0.4, 0.28, 0.5, "#6d90c9"],
  [0.1, 0.12, 0.35, "#b96f6f"],
  [0.35, -0.18, 0.42, "#7fa66a"],
]

/** A mobile whiteboard: framed board on a rolling stand. */
export const Whiteboard = ({ color = "#b9bcc4" }: Props) => (
  <group>
    {/* Frame */}
    <RoundedBox
      args={[WIDTH, BOARD_H + 0.08, 0.06]}
      radius={0.02}
      smoothness={3}
      position={[0, BOARD_Y + BOARD_H / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.5} metalness={0.2} />
    </RoundedBox>
    {/* Writing surface */}
    <mesh position={[0, BOARD_Y + BOARD_H / 2, 0.032]}>
      <planeGeometry args={[WIDTH - 0.1, BOARD_H - 0.04]} />
      <Surface color="#f6f7f8" roughness={0.35} />
    </mesh>
    {SCRIBBLES.map(([x, y, length, scribbleColor], i) => (
      <mesh key={i} position={[x, BOARD_Y + BOARD_H / 2 + y, 0.035]}>
        <boxGeometry args={[length, 0.02, 0.004]} />
        <Surface color={scribbleColor} roughness={0.6} />
      </mesh>
    ))}
    {/* Marker tray */}
    <RoundedBox
      args={[WIDTH * 0.5, 0.03, 0.08]}
      radius={0.01}
      smoothness={2}
      position={[0, BOARD_Y - 0.02, 0.05]}
      castShadow
    >
      <Surface color={color} roughness={0.5} />
    </RoundedBox>
    {/* Uprights + feet */}
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh position={[side * (WIDTH / 2 - 0.06), BOARD_Y / 2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, BOARD_Y, 12]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh
          position={[side * (WIDTH / 2 - 0.06), 0.03, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[0.02, 0.02, 0.5, 12]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
    ))}
    {/* Sticky notes from the last session */}
    <StickyNote position={[0.5, BOARD_Y + BOARD_H - 0.15, 0.036]} />
    <StickyNote color="#f5a7b8" position={[0.6, BOARD_Y + BOARD_H - 0.15, 0.036]} />
    <StickyNote color="#9fd6c2" position={[0.55, BOARD_Y + BOARD_H - 0.25, 0.036]} />
  </group>
)
