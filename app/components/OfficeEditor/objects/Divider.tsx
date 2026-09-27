import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  /** Felt colour. */
  color?: string
}

const W = 1.9
const H = 1.15
const T = 0.06
const FOOT = 0.12

/** A free-standing acoustic felt screen on two feet — splits open-plan spaces. */
export const Divider = ({ color = "#5f8a86" }: Props) => (
  <group>
    <RoundedBox
      args={[W, H, T]}
      radius={0.028}
      smoothness={3}
      position={[0, FOOT + H / 2, 0]}
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
          position={[x, FOOT + H / 2, side * (T / 2 + 0.001)]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <planeGeometry args={[0.012, H - 0.12]} />
          <Surface color={PALETTE.seatLeg} roughness={1} />
        </mesh>
      ))
    )}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * (W / 2 - 0.3), 0, 0]}>
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
