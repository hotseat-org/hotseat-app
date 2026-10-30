import { PALETTE } from "../palette"
import { Glass } from "./GlassWall"
import { Surface } from "./Surface"
import { WALL } from "./dimensions"

interface Props {
  /** Frame + handle colour. */
  color?: string
}

const POST = 0.05
const HEAD = 0.1
const FRAME_D = WALL.depth + 0.02
const OPENING = WALL.width - POST * 2
const LEAF_H = WALL.height - HEAD - 0.04
const RAIL = 0.035

/**
 * A 1-unit glass door: a slim metal frame and a frameless glass leaf standing
 * ajar on its hinge, with a long bar pull. Sits in glass partitions and solid
 * walls alike.
 */
export const GlassDoor = ({ color = PALETTE.seatLeg }: Props) => {
  const postX = WALL.width / 2 - POST / 2

  return (
    <group>
      {[-postX, postX].map((x) => (
        // Up to the head, not behind it: they'd share its faces (z-fighting).
        <mesh
          key={x}
          position={[x, (WALL.height - HEAD - WALL.sink) / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[POST, WALL.height - HEAD + WALL.sink, FRAME_D]} />
          <Surface color={color} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, WALL.height - HEAD / 2, 0]} castShadow>
        <boxGeometry args={[WALL.width, HEAD, FRAME_D]} />
        <Surface color={color} roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Leaf, hinged on the left post */}
      <group position={[-OPENING / 2, 0, 0]} rotation={[0, Math.PI / 6, 0]}>
        <group position={[OPENING / 2, 0.02, 0.03]}>
          {/* Top and bottom patch rails */}
          {[RAIL / 2, LEAF_H - RAIL / 2].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <boxGeometry args={[OPENING, RAIL, 0.035]} />
              <Surface color={color} roughness={0.35} metalness={0.5} />
            </mesh>
          ))}
          <Glass args={[OPENING, LEAF_H - RAIL * 2, 0.02]} position={[0, LEAF_H / 2, 0]} />
          {/* Bar pull, both faces */}
          {[-1, 1].map((side) => (
            <mesh key={side} position={[OPENING / 2 - 0.1, LEAF_H / 2, side * 0.05]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.5, 10]} />
              <Surface color={PALETTE.doorHandle} roughness={0.3} metalness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}
