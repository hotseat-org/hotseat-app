import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Books, Flowers, FruitBowl, Glass, Magazine, Mug, Remote, Succulent } from "./props"
import { look } from "./looks"
import { Surface } from "./Surface"

interface Props {
  color?: string
  variant?: number
}

const W = 1.2
const D = 0.6
const H = 0.35
const TT = 0.06

/** A low coffee table with a lower shelf. */
export const CoffeeTable = ({ color = PALETTE.deskTop, variant }: Props) => {
  const lx = W / 2 - 0.08
  const lz = D / 2 - 0.08
  const legs: [number, number][] = [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ]
  return (
    <group>
      <RoundedBox
        args={[W, TT, D]}
        radius={0.03}
        smoothness={4}
        position={[0, H, 0]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.6} />
      </RoundedBox>
      <RoundedBox
        args={[W - 0.16, 0.04, D - 0.16]}
        radius={0.02}
        smoothness={3}
        position={[0, 0.12, 0]}
        castShadow
      >
        <Surface color={color} roughness={0.6} />
      </RoundedBox>
      {legs.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, H / 2, z]} castShadow>
          <boxGeometry args={[0.06, H, 0.06]} />
          <Surface color={PALETTE.deskLeg} roughness={0.7} />
        </mesh>
      ))}
      {/* Lived-in, one arrangement per look (books or magazines on the shelf) */}
      {look(variant, 3) === 0 && (
        <>
          <Mug color="#e9876a" position={[0.3, H + TT / 2, 0.14]} />
          <Succulent pot="#6d90c9" position={[0.42, H + TT / 2, -0.12]} />
          <Magazine position={[-0.1, H + TT / 2, 0.02]} turn={0.3} />
          <Magazine color="#6d90c9" position={[-0.14, H + TT / 2 + 0.008, 0.05]} turn={-0.15} />
          <Remote position={[0.18, H + TT / 2, -0.14]} turn={1.2} />
          <Flowers position={[-0.42, H + TT / 2, -0.12]} />
          <Books position={[0.2, 0.14, 0]} turn={0.1} />
        </>
      )}
      {look(variant, 3) === 1 && (
        <>
          <Books colors={["#5f8a86", "#e8c07a"]} position={[-0.3, H + TT / 2, 0]} turn={-0.3} />
          <Succulent pot="#f3f1ec" position={[0.36, H + TT / 2, -0.1]} />
          <Remote position={[0.1, H + TT / 2, 0.12]} turn={0.4} />
          <Magazine color="#e8c07a" position={[-0.1, 0.14, 0]} turn={0.2} />
        </>
      )}
      {look(variant, 3) === 2 && (
        <>
          <FruitBowl position={[-0.05, H + TT / 2, 0]} />
          <Glass drink="#9e3b3b" position={[0.34, H + TT / 2, 0.1]} />
          <Glass drink="#9e3b3b" position={[0.42, H + TT / 2, -0.08]} />
          <Magazine color="#5f8a86" position={[-0.38, H + TT / 2, 0.02]} turn={1.3} />
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
