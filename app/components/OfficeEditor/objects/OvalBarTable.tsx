import { PALETTE } from "../palette"
import { Bottle, Glass, Laptop, Mug, Plate } from "./props"
import { look } from "./looks"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const W = 1.8
const D = 0.8
const H = 1.04

/** A long oval standing-height bar table on two pedestals with a foot rail. */
export const OvalBarTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const px = W / 2 - 0.45
  return (
    <group>
      <mesh position={[0, H - 0.025, 0]} scale={[W / D, 1, 1]} castShadow receiveShadow>
        <cylinderGeometry args={[D / 2, D / 2, 0.05, 48]} />
        <Surface color={color} roughness={0.55} />
      </mesh>
      {[-px, px].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (H - 0.05) / 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, H - 0.05, 14]} />
            <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.24, 0.04, 28]} />
            <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Foot rail between the pedestals */}
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, px * 2, 10]} />
        <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Lived-in, one per look: drinks and a snack, or people working */}
      {look(variant, 2) === 0 ? (
        <>
          <Plate food="sushi" position={[0, H, 0]} />
          <Bottle color="#5f8a86" position={[-0.45, H, -0.12]} />
          <Glass drink="#e8c07a" position={[-0.6, H, 0.15]} />
          <Glass drink="#e8c07a" position={[0.5, H, 0.18]} />
          <Glass drink="#cfe6f0" position={[0.7, H, -0.1]} />
        </>
      ) : (
        <>
          <Laptop position={[-0.4, H, 0.1]} turn={0.1} />
          <Laptop color="#3d4657" position={[0.45, H, -0.1]} turn={Math.PI - 0.1} />
          <Mug color="#e9876a" position={[-0.05, H, 0.2]} turn={1} />
          <Mug position={[0.05, H, -0.22]} turn={2} />
        </>
      )}
    </group>
  )
}
