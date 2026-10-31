import { Bottle, Glass, Succulent } from "../props"
import { look } from "../looks"
import { PALETTE } from "~/editor/core"
import { Surface } from "~/editor/kit"

interface Props {
  color?: string
  variant?: number
}

const TOP_Y = 1.04

/** A round standing-height bar table on a pedestal and a weighted disc base. */
export const BarTable = ({ color = PALETTE.deskTop, variant }: Props) => (
  <group>
    <mesh position={[0, TOP_Y, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.42, 0.42, 0.05, 32]} />
      <Surface color={color} roughness={0.6} />
    </mesh>
    <mesh position={[0, TOP_Y / 2, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.04, TOP_Y, 14]} />
      <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
    </mesh>
    <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.26, 0.28, 0.04, 28]} />
      <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
    </mesh>
    {/* Lived-in, one per look: wine, beers, or just a plant */}
    {look(variant, 3) === 0 && (
      <>
        <Bottle color="#6b3a3a" position={[0.08, TOP_Y + 0.025, -0.1]} />
        <Glass drink="#9e3b3b" position={[-0.16, TOP_Y + 0.025, 0.1]} />
        <Glass drink="#9e3b3b" position={[0.18, TOP_Y + 0.025, 0.16]} />
      </>
    )}
    {look(variant, 3) === 1 && (
      <>
        <Bottle color="#a8742a" position={[-0.12, TOP_Y + 0.025, -0.06]} />
        <Bottle color="#a8742a" position={[0.14, TOP_Y + 0.025, 0.08]} />
        <Glass drink="#e8c07a" position={[0.02, TOP_Y + 0.025, 0.2]} />
      </>
    )}
    {look(variant, 3) === 2 && <Succulent position={[0, TOP_Y + 0.025, 0]} />}
  </group>
)
