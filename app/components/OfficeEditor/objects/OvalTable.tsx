import { PALETTE } from "../palette"
import { Bottle, Flowers, Glass, Laptop, Notebook } from "./props"
import { look } from "./looks"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const W = 2.8
const D = 1.3
const H = 0.74

/** An oval boardroom table on two pedestals with a cable box in the middle. */
export const OvalTable = ({ color = PALETTE.deskTop, variant }: Props) => (
  <group>
    {/* Top: a cylinder squashed into an ellipse */}
    <mesh position={[0, H - 0.035, 0]} scale={[W / D, 1, 1]} castShadow receiveShadow>
      <cylinderGeometry args={[D / 2, D / 2, 0.07, 48]} />
      <Surface color={color} roughness={0.5} />
    </mesh>
    <mesh position={[0, H + 0.004, 0]}>
      <boxGeometry args={[0.36, 0.01, 0.14]} />
      <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * (W / 2 - 0.65), 0, 0]}>
        <mesh position={[0, (H - 0.07) / 2, 0]} castShadow>
          <boxGeometry args={[0.14, H - 0.07, 0.5]} />
          <Surface color={PALETTE.deskLeg} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.04, 0.8]} />
          <Surface color={PALETTE.deskLeg} roughness={0.6} />
        </mesh>
      </group>
    ))}
    {/* Lived-in, one scene per look: a meeting in progress, or set for one */}
    {look(variant, 2) === 0 ? (
      <>
        <Flowers position={[0.45, H, 0]} />
        <Laptop position={[-0.8, H, 0.32]} turn={0.15} />
        <Laptop color="#3d4657" position={[0.9, H, -0.3]} turn={Math.PI} />
        <Notebook position={[-0.2, H, 0.36]} turn={0.25} />
        <Notebook color="#5f8a86" position={[-0.9, H, -0.32]} turn={Math.PI - 0.2} />
        <Glass drink="#cfe6f0" position={[-0.5, H, 0.4]} />
        <Glass drink="#cfe6f0" position={[1.15, H, -0.15]} />
      </>
    ) : (
      <>
        <Flowers vase="#f3f1ec" position={[-0.2, H, 0]} />
        <Bottle color="#9fc3c9" position={[0.2, H, 0]} />
        {[-0.9, -0.3, 0.3, 0.9].map((x) => (
          <group key={x}>
            <Glass position={[x, H, 0.38]} />
            <Glass position={[x, H, -0.38]} />
          </group>
        ))}
      </>
    )}
  </group>
)
