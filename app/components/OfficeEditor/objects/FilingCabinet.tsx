import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 0.46
const D = 0.52
const H = 0.72

/** A two-drawer filing cabinet with recessed drawer fronts and pull handles. */
export const FilingCabinet = ({ color = "#8f9aa6" }: Props) => (
  <group>
    {/* Body */}
    <RoundedBox
      args={[W, H, D]}
      radius={0.03}
      smoothness={4}
      position={[0, H / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.5} metalness={0.15} />
    </RoundedBox>
    {/* Drawers */}
    {[0.28, 0.72].map((f) => (
      <group key={f} position={[0, H * f, D / 2]}>
        <RoundedBox
          args={[W - 0.08, H * 0.36, 0.03]}
          radius={0.02}
          smoothness={3}
          position={[0, 0, 0.01]}
          castShadow
        >
          <Surface color={color} roughness={0.45} metalness={0.2} />
        </RoundedBox>
        {/* Handle */}
        <mesh position={[0, 0.02, 0.04]} castShadow>
          <boxGeometry args={[0.18, 0.03, 0.03]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
      </group>
    ))}
  </group>
)
