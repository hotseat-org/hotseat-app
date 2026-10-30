import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"

interface Props {
  /** Felt colour. */
  color?: string
}

const WIDTH = 1.9
const HEIGHT = 1.15
const THICKNESS = 0.06
const FOOT = 0.12

/** A free-standing acoustic felt screen on two feet — splits open-plan spaces. */
export const Divider = ({ color = "#5f8a86" }: Props) => (
  <group>
    <RoundedBox
      args={[WIDTH, HEIGHT, THICKNESS]}
      radius={0.028}
      smoothness={3}
      position={[0, FOOT + HEIGHT / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={1} />
    </RoundedBox>
    {/* Stitched grooves */}
    {[-0.5, 0, 0.5].map((x) =>
      [-1, 1].map((side) => (
        <mesh
          key={`${x},${side}`}
          position={[x, FOOT + HEIGHT / 2, side * (THICKNESS / 2 + 0.001)]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <planeGeometry args={[0.012, HEIGHT - 0.12]} />
          <Surface color={PALETTE.seatLeg} roughness={1} />
        </mesh>
      ))
    )}
    {[-1, 1].map((side) => (
      <group key={side} position={[side * (WIDTH / 2 - 0.3), 0, 0]}>
        <mesh position={[0, FOOT / 2, 0]} castShadow>
          <boxGeometry args={[0.04, FOOT, 0.04]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.012, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.06, 0.024, 0.4]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
    ))}
  </group>
)
