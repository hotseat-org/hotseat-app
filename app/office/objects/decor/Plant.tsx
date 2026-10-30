import { PALETTE } from "~/editor/palette"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

/** A leafy plant in a terracotta pot — a bit of life for the diorama. */
export const Plant = ({ color = PALETTE.plantLeaf }: Props) => {
  const blobs: [number, number, number, number][] = [
    // x, y, z, radius
    [0, 0.62, 0, 0.26],
    [-0.16, 0.52, 0.08, 0.19],
    [0.17, 0.5, -0.06, 0.18],
    [0.04, 0.78, -0.02, 0.18],
  ]

  return (
    <group>
      {/* Pot */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.32, 20]} />
        <Surface color={PALETTE.pot} roughness={0.85} />
      </mesh>
      {/* Soil rim */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 20]} />
        <Surface color="#5b463a" roughness={1} />
      </mesh>
      {/* Foliage */}
      {blobs.map(([x, y, z, radius], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[radius, 1]} />
          <Surface
            color={i % 2 === 0 ? color : PALETTE.plantLeafDark}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
    </group>
  )
}
