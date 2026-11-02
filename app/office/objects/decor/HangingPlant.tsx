import { PALETTE } from "~/editor/core"
import { Surface } from "~/editor/kit"

interface Props {
  color?: string
}

/** Where the pot hangs: above the walls (1.4), like the ceiling lights. */
const POT_HEIGHT = 2.0
const CORD = 0.9

/** The trailing strands: where each leaves the pot (angle) and how far down it falls. */
const STRANDS: [number, number][] = [
  [0.2, 0.55],
  [1.3, 0.4],
  [2.4, 0.62],
  [3.4, 0.35],
  [4.4, 0.5],
  [5.4, 0.45],
]
const LEAVES_PER_STRAND = 4

/** A trailing plant in a hanging pot: a cord from the ceiling, a pot, and strands falling from it. */
export const HangingPlant = ({ color = PALETTE.plantLeaf }: Props) => (
  <group>
    {/* Cord, and three hanger strings down to the pot */}
    <mesh position={[0, POT_HEIGHT + 0.3 + CORD / 2, 0]}>
      <cylinderGeometry args={[0.006, 0.006, CORD, 5]} />
      <Surface color="#e8dcc6" roughness={0.9} />
    </mesh>
    {[0, 2.1, 4.2].map((angle) => (
      <mesh
        key={angle}
        position={[Math.cos(angle) * 0.07, POT_HEIGHT + 0.17, Math.sin(angle) * 0.07]}
        rotation={[Math.sin(angle) * -0.45, 0, Math.cos(angle) * 0.45]}
      >
        <cylinderGeometry args={[0.004, 0.004, 0.3, 4]} />
        <Surface color="#e8dcc6" roughness={0.9} />
      </mesh>
    ))}
    {/* Pot and the foliage over its rim */}
    <mesh position={[0, POT_HEIGHT, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.1, 0.16, 16]} />
      <Surface color="#f3f1ec" roughness={0.5} />
    </mesh>
    <mesh position={[0, POT_HEIGHT + 0.09, 0]} scale={[1, 0.5, 1]} castShadow>
      <icosahedronGeometry args={[0.17, 1]} />
      <Surface color={color} roughness={0.9} flatShading />
    </mesh>
    {/* Strands: leaves down from the rim, drifting out */}
    {STRANDS.flatMap(([angle, fall]) =>
      Array.from({ length: LEAVES_PER_STRAND }, (_, i) => {
        const share = (i + 1) / LEAVES_PER_STRAND
        const out = 0.14 + share * 0.05

        return (
          <mesh
            key={`${angle}${i}`}
            position={[
              Math.cos(angle) * out,
              POT_HEIGHT + 0.02 - share * fall,
              Math.sin(angle) * out,
            ]}
            castShadow
          >
            <icosahedronGeometry args={[0.05 - i * 0.006, 0]} />
            <Surface color={i % 2 ? PALETTE.plantLeafDark : color} roughness={0.9} flatShading />
          </mesh>
        )
      })
    )}
  </group>
)
