import { Surface } from "./Surface"

interface Props {
  color?: string
}

const W = 3.0
const D = 2.0

/** A flat floor rug (two stacked panels for a border). Furniture can sit on it. */
export const Rug = ({ color = "#b96f6f" }: Props) => (
  <group>
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[W, D]} />
      <Surface color={color} roughness={1} />
    </mesh>
    <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[W - 0.34, D - 0.34]} />
      <Surface color="#d7a3a3" roughness={1} />
    </mesh>
  </group>
)
