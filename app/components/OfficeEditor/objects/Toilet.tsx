import { RoundedBox } from "@react-three/drei"
import { Surface } from "./Surface"

interface Props {
  color?: string
}

/** Footprint is 0.5 × 1 m; the cistern sits against the back (−Z) edge. */
const BACK = -0.5

/** A toilet: cistern with a flush button, rounded bowl, seat and raised lid. Faces +Z. */
export const Toilet = ({ color = "#f3f1ec" }: Props) => {
  const bowlZ = BACK + 0.42
  return (
    <group>
      {/* Cistern */}
      <RoundedBox
        args={[0.4, 0.4, 0.17]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.62, BACK + 0.1]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.25} />
      </RoundedBox>
      <mesh position={[0, 0.83, BACK + 0.1]}>
        <cylinderGeometry args={[0.035, 0.035, 0.012, 16]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>
      {/* Pedestal + bowl (an elongated round) */}
      <mesh position={[0, 0.18, bowlZ - 0.02]} scale={[1, 1, 1.25]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.36, 24]} />
        <Surface color={color} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.34, bowlZ]} scale={[1, 1, 1.3]} castShadow receiveShadow>
        <cylinderGeometry args={[0.19, 0.15, 0.1, 28]} />
        <Surface color={color} roughness={0.25} />
      </mesh>
      {/* Seat ring */}
      <mesh
        position={[0, 0.4, bowlZ]}
        scale={[1, 1.3, 1]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[0.15, 0.03, 10, 28]} />
        <Surface color={color} roughness={0.35} />
      </mesh>
      {/* Lid, raised against the cistern */}
      <mesh position={[0, 0.6, BACK + 0.2]} rotation={[-0.2, 0, 0]} scale={[1, 1.3, 1]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.025, 28]} />
        <Surface color={color} roughness={0.35} />
      </mesh>
    </group>
  )
}
