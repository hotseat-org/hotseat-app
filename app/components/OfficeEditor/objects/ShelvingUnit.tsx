import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"

interface Props {
  /** Shelf colour. */
  color?: string
}

const WIDTH = 1.4
const DEPTH = 0.42
const HEIGHT = 1.7
const SHELVES = [0.1, 0.5, 0.9, 1.3, 1.66]
const POST = 0.035

/** Box/plant/binder props on the shelves: [shelf, x, width, height, colour]. */
const ITEMS: [number, number, number, number, string][] = [
  [0, -0.35, 0.4, 0.28, "#c9946a"],
  [0, 0.25, 0.5, 0.3, "#b9a58a"],
  [1, -0.45, 0.08, 0.3, "#6d90c9"],
  [1, -0.36, 0.08, 0.3, "#b96f6f"],
  [1, -0.27, 0.08, 0.28, "#e8c07a"],
  [1, 0.35, 0.34, 0.22, "#c9946a"],
  [2, 0.1, 0.44, 0.26, "#b9a58a"],
  [3, -0.3, 0.3, 0.2, "#5f8a86"],
  [3, 0.38, 0.08, 0.3, "#8b7fb0"],
  [3, 0.47, 0.08, 0.3, "#6d90c9"],
]

/**
 * Open, free-standing metal shelving: four slim corner posts, five shelves, and
 * storage boxes and binders on them. Works against a wall or as a divider.
 */
export const ShelvingUnit = ({ color = "#e9e1d4" }: Props) => {
  const postOffsetX = WIDTH / 2 - POST / 2
  const postOffsetZ = DEPTH / 2 - POST / 2
  return (
    <group>
      {[-postOffsetX, postOffsetX].map((x) =>
        [-postOffsetZ, postOffsetZ].map((z) => (
          <mesh key={`${x},${z}`} position={[x, HEIGHT / 2, z]} castShadow>
            <boxGeometry args={[POST, HEIGHT, POST]} />
            <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
          </mesh>
        ))
      )}
      {SHELVES.map((y) => (
        <RoundedBox
          key={y}
          args={[WIDTH - 0.02, 0.03, DEPTH - 0.02]}
          radius={0.01}
          smoothness={2}
          position={[0, y, 0]}
          castShadow
          receiveShadow
        >
          <Surface color={color} roughness={0.6} />
        </RoundedBox>
      ))}
      {ITEMS.map(([shelf, x, width, height, itemColor], i) => (
        <RoundedBox
          key={i}
          args={[width, height, DEPTH - 0.12]}
          radius={0.012}
          smoothness={2}
          position={[x, SHELVES[shelf] + 0.015 + height / 2, 0]}
          castShadow
        >
          <Surface color={itemColor} roughness={0.75} />
        </RoundedBox>
      ))}
      {/* A small plant on the top shelf */}
      <mesh position={[-0.35, SHELVES[4] + 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.055, 0.14, 14]} />
        <Surface color={PALETTE.pot} roughness={0.7} />
      </mesh>
      <mesh position={[-0.35, SHELVES[4] + 0.25, 0]} castShadow>
        <icosahedronGeometry args={[0.13, 0]} />
        <Surface color={PALETTE.plantLeaf} roughness={0.8} flatShading />
      </mesh>
    </group>
  )
}
