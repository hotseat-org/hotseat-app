import { Books, Flowers, Mug, Succulent } from "../props"
import { look } from "../looks"
import { WALL_FACE } from "../wallItem"
import { Surface } from "~/editor/objects/Surface"
import { PALETTE } from "~/editor/palette"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 0.9
const DEPTH = 0.2
const HANG_HEIGHT = 0.88

/** A floating wall shelf; its look decides what's on it. */
export const WallShelf = ({ color = PALETTE.deskTop, variant }: Props) => {
  const lookIndex = look(variant, 3)

  return (
    <group position={[0, HANG_HEIGHT, WALL_FACE]}>
      <mesh position={[0, 0, DEPTH / 2]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH, 0.03, DEPTH]} />
        <Surface color={color} roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (WIDTH / 2 - 0.12), -0.05, 0.03]}>
          <boxGeometry args={[0.02, 0.1, 0.06]} />
          <Surface color={PALETTE.seatLeg} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      <group position={[0, 0.015, DEPTH / 2]}>
        {lookIndex === 0 && (
          <>
            <Books position={[-0.22, 0, 0]} turn={0.1} />
            <Succulent position={[0.25, 0, 0]} />
          </>
        )}
        {lookIndex === 1 && (
          <>
            <Succulent pot="#6d90c9" position={[-0.3, 0, 0]} />
            <Flowers vase="#f3f1ec" position={[0, 0, 0]} />
            <Mug color="#e9876a" position={[0.28, 0, 0]} turn={2} />
          </>
        )}
        {lookIndex === 2 && (
          <>
            <Books colors={["#5f8a86", "#e8c07a"]} position={[0.2, 0, 0]} turn={-0.2} />
            <Succulent pot="#f3f1ec" position={[-0.18, 0, 0]} />
            <Succulent position={[-0.32, 0, 0]} />
          </>
        )}
      </group>
    </group>
  )
}
