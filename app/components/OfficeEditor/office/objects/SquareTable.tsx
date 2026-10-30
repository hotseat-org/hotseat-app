import { PALETTE } from "../../palette"
import { RoundedBox } from "../../objects/RoundedBox"
import { Surface } from "../../objects/Surface"
import { Croissant, Glass, Laptop, Magazine, Mug, Plate, Succulent } from "./props"
import { look } from "./looks"

interface Props {
  color?: string
  variant?: number
}

const SIDE = 0.8
const HEIGHT = 0.74
const TOP_THICKNESS = 0.05

/** A small square café table on four slim, slightly splayed metal legs. */
export const SquareTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const legOffset = SIDE / 2 - 0.08
  return (
    <group>
      <RoundedBox
        args={[SIDE, TOP_THICKNESS, SIDE]}
        radius={0.02}
        smoothness={3}
        position={[0, HEIGHT - TOP_THICKNESS / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.55} />
      </RoundedBox>
      {[-1, 1].map((sideX) =>
        [-1, 1].map((sideZ) => (
          <mesh
            key={`${sideX},${sideZ}`}
            position={[sideX * legOffset, (HEIGHT - TOP_THICKNESS) / 2, sideZ * legOffset]}
            rotation={[sideZ * -0.04, 0, sideX * 0.04]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.014, HEIGHT - TOP_THICKNESS, 10]} />
            <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
          </mesh>
        ))
      )}
      {/* Lived-in, one arrangement per look */}
      {look(variant, 3) === 0 && (
        <>
          <Mug hot position={[0.14, HEIGHT, 0.12]} />
          <Succulent pot="#e9876a" position={[0.24, HEIGHT, -0.24]} />
          <Plate position={[-0.1, HEIGHT, 0.1]} />
          <Croissant position={[-0.1, HEIGHT + 0.016, 0.1]} turn={0.6} />
          <Magazine color="#5f8a86" position={[0.05, HEIGHT, -0.16]} turn={1.35} />
        </>
      )}
      {look(variant, 3) === 1 && (
        <>
          <Laptop position={[-0.05, HEIGHT, -0.06]} turn={0.15} />
          <Mug color="#6d90c9" position={[0.26, HEIGHT, 0.22]} turn={1} />
        </>
      )}
      {look(variant, 3) === 2 && (
        <>
          <Succulent position={[0, HEIGHT, 0]} />
          <Glass drink="#cfe6f0" position={[0.2, HEIGHT, 0.18]} />
        </>
      )}
    </group>
  )
}
