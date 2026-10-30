import { Bottle, Glass, Laptop, Mug, Plate } from "../props"
import { look } from "../looks"
import { PALETTE } from "~/editor/palette"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 1.8
const DEPTH = 0.8
const HEIGHT = 1.04

/** A long oval standing-height bar table on two pedestals with a foot rail. */
export const OvalBarTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const legOffsetX = WIDTH / 2 - 0.45

  return (
    <group>
      <mesh
        position={[0, HEIGHT - 0.025, 0]}
        scale={[WIDTH / DEPTH, 1, 1]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[DEPTH / 2, DEPTH / 2, 0.05, 48]} />
        <Surface color={color} roughness={0.55} />
      </mesh>
      {[-legOffsetX, legOffsetX].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, (HEIGHT - 0.05) / 2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, HEIGHT - 0.05, 14]} />
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
        <cylinderGeometry args={[0.016, 0.016, legOffsetX * 2, 10]} />
        <Surface color={PALETTE.seatLeg} roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Lived-in, one per look: drinks and a snack, or people working */}
      {look(variant, 2) === 0 ? (
        <>
          <Plate food="sushi" position={[0, HEIGHT, 0]} />
          <Bottle color="#5f8a86" position={[-0.45, HEIGHT, -0.12]} />
          <Glass drink="#e8c07a" position={[-0.6, HEIGHT, 0.15]} />
          <Glass drink="#e8c07a" position={[0.5, HEIGHT, 0.18]} />
          <Glass drink="#cfe6f0" position={[0.7, HEIGHT, -0.1]} />
        </>
      ) : (
        <>
          <Laptop position={[-0.4, HEIGHT, 0.1]} turn={0.1} />
          <Laptop color="#3d4657" position={[0.45, HEIGHT, -0.1]} turn={Math.PI - 0.1} />
          <Mug color="#e9876a" position={[-0.05, HEIGHT, 0.2]} turn={1} />
          <Mug position={[0.05, HEIGHT, -0.22]} turn={2} />
        </>
      )}
    </group>
  )
}
