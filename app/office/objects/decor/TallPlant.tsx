import { look } from "../looks"
import { PALETTE } from "~/editor/core"
import { Surface } from "~/editor/kit"

interface Props {
  color?: string
  variant?: number
}

const BASKET = "#c9a27e"
const BASKET_HEIGHT = 0.4

/** A woven basket: its body, banded darker, and the soil. */
const Basket = () => (
  <group>
    <mesh position={[0, BASKET_HEIGHT / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.23, 0.19, BASKET_HEIGHT, 20]} />
      <Surface color={BASKET} roughness={0.95} />
    </mesh>
    {[0.1, 0.22, 0.34].map((y) => (
      <mesh key={y} position={[0, y, 0]}>
        <cylinderGeometry args={[0.2 + y * 0.1 + 0.004, 0.2 + y * 0.1 - 0.004, 0.03, 20]} />
        <Surface color="#a8815e" roughness={0.95} />
      </mesh>
    ))}
    <mesh position={[0, BASKET_HEIGHT - 0.01, 0]}>
      <cylinderGeometry args={[0.22, 0.22, 0.02, 20]} />
      <Surface color="#5b463a" roughness={1} />
    </mesh>
  </group>
)

/** A fiddle-leaf fig: a slim trunk with big round leaves up it. */
const FiddleLeaf = ({ color }: { color: string }) => {
  const leaves: [number, number, number, number][] = [
    // height, angle round the trunk, lean out, size
    [0.95, 0, 0.12, 0.13],
    [1.08, 2.1, 0.14, 0.14],
    [1.2, 4.2, 0.12, 0.13],
    [1.3, 1.1, 0.13, 0.15],
    [1.42, 3.2, 0.12, 0.14],
    [1.52, 5.2, 0.1, 0.13],
    [1.62, 0.4, 0.06, 0.12],
  ]

  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.025, 1.1, 6]} />
        <Surface color="#7a5a3c" roughness={0.9} />
      </mesh>
      {leaves.map(([y, angle, out, size], i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * out, y, Math.sin(angle) * out]}
          rotation={[0.5, -angle, 0.3]}
          scale={[1, 1.3, 0.25]}
          castShadow
        >
          <icosahedronGeometry args={[size, 1]} />
          <Surface color={i % 2 ? color : PALETTE.plantLeafDark} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** A snake plant: stiff upright blades, a few leaning out. */
const SnakePlant = ({ color }: { color: string }) => {
  const blades: [number, number, number, number][] = [
    // x, z, height, lean
    [0, 0, 0.8, 0],
    [0.08, 0.05, 0.7, 0.12],
    [-0.08, 0.04, 0.65, -0.14],
    [0.03, -0.09, 0.72, -0.08],
    [-0.06, -0.06, 0.6, 0.1],
    [0.11, -0.04, 0.55, 0.2],
    [-0.11, 0.0, 0.5, -0.22],
  ]

  return (
    <group position={[0, BASKET_HEIGHT, 0]}>
      {blades.map(([x, z, height, lean], i) => (
        <mesh
          key={i}
          position={[x, height / 2, z]}
          rotation={[lean * 0.6, i * 0.9, lean]}
          castShadow
        >
          <boxGeometry args={[0.07, height, 0.018]} />
          <Surface color={i % 2 ? PALETTE.plantLeafDark : color} roughness={0.7} flatShading />
        </mesh>
      ))}
    </group>
  )
}

/** A kentia palm: arching fronds fanning out from the basket. */
const Palm = ({ color }: { color: string }) => (
  <group position={[0, BASKET_HEIGHT, 0]}>
    {Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2
      const isTall = i % 2 === 0
      const height = isTall ? 0.95 : 0.7

      return (
        <group key={i} rotation={[0, angle, 0]}>
          {/* Stem rising, then the frond arching out */}
          <mesh position={[0.06, height / 2, 0]} rotation={[0, 0, -0.12]} castShadow>
            <cylinderGeometry args={[0.008, 0.012, height, 5]} />
            <Surface color={PALETTE.plantLeafDark} roughness={0.8} />
          </mesh>
          <mesh
            position={[0.24, height - 0.02, 0]}
            rotation={[0, 0, isTall ? -0.6 : -0.8]}
            scale={[1, 0.08, 0.35]}
            castShadow
          >
            <icosahedronGeometry args={[0.26, 1]} />
            <Surface color={isTall ? color : PALETTE.plantLeafDark} roughness={0.8} flatShading />
          </mesh>
        </group>
      )
    })}
  </group>
)

const TALL_PLANTS = [FiddleLeaf, SnakePlant, Palm]

/** A tall plant in a woven basket. Its look picks it: a fiddle-leaf fig, a snake plant or a palm. */
export const TallPlant = ({ color = PALETTE.plantLeaf, variant }: Props) => {
  const Kind = TALL_PLANTS[look(variant, TALL_PLANTS.length)]

  return (
    <group>
      <Basket />
      <Kind color={color} />
    </group>
  )
}
