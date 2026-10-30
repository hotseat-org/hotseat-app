import { Books, Flowers, FruitBowl, Glass, Magazine, Mug, Remote, Succulent } from "./props"
import { look } from "./looks"
import { PALETTE } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
  variant?: number
}

const WIDTH = 1.2
const DEPTH = 0.6
const HEIGHT = 0.35
const TOP_THICKNESS = 0.06

/** A low coffee table with a lower shelf. */
export const CoffeeTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const legOffsetX = WIDTH / 2 - 0.08
  const legOffsetZ = DEPTH / 2 - 0.08
  const legs: [number, number][] = [
    [-legOffsetX, -legOffsetZ],
    [legOffsetX, -legOffsetZ],
    [-legOffsetX, legOffsetZ],
    [legOffsetX, legOffsetZ],
  ]
  return (
    <group>
      <RoundedBox
        args={[WIDTH, TOP_THICKNESS, DEPTH]}
        radius={0.03}
        smoothness={4}
        position={[0, HEIGHT, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.6} />
      </RoundedBox>
      <RoundedBox
        args={[WIDTH - 0.16, 0.04, DEPTH - 0.16]}
        radius={0.02}
        smoothness={3}
        position={[0, 0.12, 0]}
        castShadow
      >
        <Surface color={color} roughness={0.6} />
      </RoundedBox>
      {legs.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, HEIGHT / 2, z]} castShadow>
          <boxGeometry args={[0.06, HEIGHT, 0.06]} />
          <Surface color={PALETTE.deskLeg} roughness={0.7} />
        </mesh>
      ))}
      {/* Lived-in, one arrangement per look (books or magazines on the shelf) */}
      {look(variant, 3) === 0 && (
        <>
          <Mug color="#e9876a" position={[0.3, HEIGHT + TOP_THICKNESS / 2, 0.14]} />
          <Succulent pot="#6d90c9" position={[0.42, HEIGHT + TOP_THICKNESS / 2, -0.12]} />
          <Magazine position={[-0.1, HEIGHT + TOP_THICKNESS / 2, 0.02]} turn={0.3} />
          <Magazine
            color="#6d90c9"
            position={[-0.14, HEIGHT + TOP_THICKNESS / 2 + 0.008, 0.05]}
            turn={-0.15}
          />
          <Remote position={[0.18, HEIGHT + TOP_THICKNESS / 2, -0.14]} turn={1.2} />
          <Flowers position={[-0.42, HEIGHT + TOP_THICKNESS / 2, -0.12]} />
          <Books position={[0.2, 0.14, 0]} turn={0.1} />
        </>
      )}
      {look(variant, 3) === 1 && (
        <>
          <Books
            colors={["#5f8a86", "#e8c07a"]}
            position={[-0.3, HEIGHT + TOP_THICKNESS / 2, 0]}
            turn={-0.3}
          />
          <Succulent pot="#f3f1ec" position={[0.36, HEIGHT + TOP_THICKNESS / 2, -0.1]} />
          <Remote position={[0.1, HEIGHT + TOP_THICKNESS / 2, 0.12]} turn={0.4} />
          <Magazine color="#e8c07a" position={[-0.1, 0.14, 0]} turn={0.2} />
        </>
      )}
      {look(variant, 3) === 2 && (
        <>
          <FruitBowl position={[-0.05, HEIGHT + TOP_THICKNESS / 2, 0]} />
          <Glass drink="#9e3b3b" position={[0.34, HEIGHT + TOP_THICKNESS / 2, 0.1]} />
          <Glass drink="#9e3b3b" position={[0.42, HEIGHT + TOP_THICKNESS / 2, -0.08]} />
          <Magazine
            color="#5f8a86"
            position={[-0.38, HEIGHT + TOP_THICKNESS / 2, 0.02]}
            turn={1.3}
          />
          <Books
            colors={["#b96f6f", "#6d90c9", "#f3e4d0"]}
            position={[-0.2, 0.14, 0]}
            turn={-0.1}
          />
        </>
      )}
    </group>
  )
}
