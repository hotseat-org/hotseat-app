import { RoundedBox } from "@react-three/drei"
import { ACCENT, PALETTE } from "../palette"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 0.66
const D = 0.58
const BODY = 0.5

/** A multifunction office printer: body, scanner lid, output tray and a lit panel. */
export const Printer = ({ color = "#e8edf2" }: Props) => (
  <group>
    {/* Main body */}
    <RoundedBox
      args={[W, BODY, D]}
      radius={0.04}
      smoothness={4}
      position={[0, BODY / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.5} />
    </RoundedBox>
    {/* Scanner lid */}
    <RoundedBox
      args={[W, 0.08, D]}
      radius={0.03}
      smoothness={3}
      position={[0, BODY + 0.04, 0]}
      castShadow
    >
      <Surface color={PALETTE.seatLeg} roughness={0.55} />
    </RoundedBox>
    {/* Output-tray slot */}
    <mesh position={[0, BODY * 0.62, D / 2 - 0.02]}>
      <boxGeometry args={[W - 0.12, 0.05, 0.03]} />
      <Surface color="#3a4150" roughness={0.7} />
    </mesh>
    {/* Paper tray lip */}
    <RoundedBox
      args={[W - 0.1, 0.05, 0.12]}
      radius={0.02}
      smoothness={3}
      position={[0, 0.1, D / 2 + 0.02]}
      castShadow
    >
      <Surface color={color} roughness={0.5} />
    </RoundedBox>
    {/* Control panel */}
    <RoundedBox
      args={[0.18, 0.1, 0.02]}
      radius={0.01}
      smoothness={3}
      position={[W / 2 - 0.16, BODY * 0.6, D / 2 - 0.005]}
      rotation={[-0.5, 0, 0]}
    >
      <Surface color={ACCENT} emissive={ACCENT} emissiveIntensity={0.7} roughness={0.4} />
    </RoundedBox>
  </group>
)
