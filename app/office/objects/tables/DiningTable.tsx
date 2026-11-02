import { FruitBowl, Glass, Plate } from "../props"
import { DESK, PALETTE } from "~/editor/core"
import { RoundedBox, Surface } from "~/editor/kit"

interface Props {
  color?: string
}

const LENGTH = 2.4
const WIDTH = 0.9
const BENCH = { length: 2.2, depth: 0.34, height: 0.45, gap: 0.68 }

/** A long table for lunch together: a bench either side, a fruit bowl and a few plates. */
export const DiningTable = ({ color = PALETTE.deskTop }: Props) => (
  <group>
    {/* Top */}
    <RoundedBox
      args={[LENGTH, DESK.topThickness, WIDTH]}
      radius={0.02}
      smoothness={2}
      position={[0, DESK.height - DESK.topThickness / 2, 0]}
      castShadow
      receiveShadow
    >
      <Surface color={color} roughness={0.55} />
    </RoundedBox>
    {/* Trestle legs */}
    {[-1, 1].map((side) => (
      <mesh
        key={side}
        position={[side * (LENGTH / 2 - 0.3), (DESK.height - DESK.topThickness) / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.08, DESK.height - DESK.topThickness, WIDTH - 0.2]} />
        <Surface color={PALETTE.deskLeg} roughness={0.6} />
      </mesh>
    ))}
    {/* Benches */}
    {[-1, 1].map((side) => (
      <group key={side} position={[0, 0, side * BENCH.gap]}>
        <mesh position={[0, BENCH.height - 0.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[BENCH.length, 0.05, BENCH.depth]} />
          <Surface color={color} roughness={0.55} />
        </mesh>
        {[-1, 1].map((end) => (
          <mesh
            key={end}
            position={[end * (BENCH.length / 2 - 0.2), (BENCH.height - 0.05) / 2, 0]}
            castShadow
          >
            <boxGeometry args={[0.06, BENCH.height - 0.05, BENCH.depth - 0.06]} />
            <Surface color={PALETTE.deskLeg} roughness={0.6} />
          </mesh>
        ))}
      </group>
    ))}
    {/* Lunch */}
    <group position={[0, DESK.height, 0]}>
      <FruitBowl />
      <Plate food="salad" position={[-0.75, 0, 0.24]} />
      <Plate food="pasta" position={[0.6, 0, -0.24]} />
      <Glass drink="#dcecf2" position={[-0.55, 0, 0.3]} />
      <Glass position={[0.82, 0, -0.3]} />
    </group>
  </group>
)
