import { Surface } from "~/editor/kit"

interface Props {
  color?: string
}

/** A slumped bean bag: a squashed body, a dent where someone sat, a hump to lean on. */
export const BeanBag = ({ color = "#e9876a" }: Props) => (
  <group rotation={[0, 0.3, 0]}>
    {/* Body */}
    <mesh position={[0, 0.2, 0.02]} scale={[1, 0.52, 1]} castShadow receiveShadow>
      <icosahedronGeometry args={[0.42, 2]} />
      <Surface color={color} roughness={0.95} flatShading />
    </mesh>
    {/* Backrest hump */}
    <mesh position={[0, 0.38, -0.18]} scale={[1, 0.85, 0.6]} castShadow>
      <icosahedronGeometry args={[0.3, 2]} />
      <Surface color={color} roughness={0.95} flatShading />
    </mesh>
  </group>
)
