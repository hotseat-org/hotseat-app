import { RoundedBox } from "@react-three/drei"
import { PALETTE } from "../palette"
import { Croissant, Glass, Laptop, Magazine, Mug, Plate, Succulent } from "./props"
import { look } from "./looks"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const S = 0.8
const H = 0.74
const TT = 0.05

/** A small square café table on four slim, slightly splayed metal legs. */
export const SquareTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const l = S / 2 - 0.08
  return (
    <group>
      <RoundedBox
        args={[S, TT, S]}
        radius={0.02}
        smoothness={3}
        position={[0, H - TT / 2, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.55} />
      </RoundedBox>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx},${sz}`}
            position={[sx * l, (H - TT) / 2, sz * l]}
            rotation={[sz * -0.04, 0, sx * 0.04]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.014, H - TT, 10]} />
            <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
          </mesh>
        ))
      )}
      {/* Lived-in, one arrangement per look */}
      {look(variant, 3) === 0 && (
        <>
          <Mug hot position={[0.14, H, 0.12]} />
          <Succulent pot="#e9876a" position={[0.24, H, -0.24]} />
          <Plate position={[-0.1, H, 0.1]} />
          <Croissant position={[-0.1, H + 0.016, 0.1]} turn={0.6} />
          <Magazine color="#5f8a86" position={[0.05, H, -0.16]} turn={1.35} />
        </>
      )}
      {look(variant, 3) === 1 && (
        <>
          <Laptop position={[-0.05, H, -0.06]} turn={0.15} />
          <Mug color="#6d90c9" position={[0.26, H, 0.22]} turn={1} />
        </>
      )}
      {look(variant, 3) === 2 && (
        <>
          <Succulent position={[0, H, 0]} />
          <Glass drink="#cfe6f0" position={[0.2, H, 0.18]} />
        </>
      )}
    </group>
  )
}
