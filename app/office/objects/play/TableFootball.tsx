import { Surface } from "~/editor/kit"

interface Props {
  /** The cabinet's colour. */
  color?: string
}

const LENGTH = 1.2
const WIDTH = 0.7
const HEIGHT = 0.9
const WALL = 0.05
const PITCH = "#5f9a5a"
const STEEL = "#b9bcc4"
const TEAMS = ["#c9564f", "#3f6a9a"]

/**
 * The rods from one goal to the other: where each stands along the table,
 * whose it is and how many players are on it (goalie, defence, midfield, attack).
 */
const RODS: [number, number, number][] = [
  [-0.5, 0, 1],
  [-0.36, 0, 2],
  [-0.2, 1, 3],
  [-0.07, 0, 5],
  [0.07, 1, 5],
  [0.2, 0, 3],
  [0.36, 1, 2],
  [0.5, 1, 1],
]

/** A table football: a cabinet on legs, a green pitch, its rods and little players, the goals. */
export const TableFootball = ({ color = "#8f6a4a" }: Props) => (
  <group>
    {/* Legs */}
    {[-1, 1].flatMap((x) =>
      [-1, 1].map((z) => (
        <mesh
          key={`${x}${z}`}
          position={[x * (LENGTH / 2 - 0.08), (HEIGHT - 0.2) / 2, z * (WIDTH / 2 - 0.08)]}
          castShadow
        >
          <boxGeometry args={[0.08, HEIGHT - 0.2, 0.08]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
      ))
    )}
    {/* The box's floor (the pitch) and its four walls */}
    <mesh position={[0, HEIGHT - 0.2, 0]} castShadow receiveShadow>
      <boxGeometry args={[LENGTH, 0.06, WIDTH]} />
      <Surface color={color} roughness={0.6} />
    </mesh>
    <mesh position={[0, HEIGHT - 0.165, 0]} receiveShadow>
      <boxGeometry args={[LENGTH - 2 * WALL, 0.01, WIDTH - 2 * WALL]} />
      <Surface color={PITCH} roughness={0.9} />
    </mesh>
    <mesh position={[0, HEIGHT - 0.159, 0]}>
      <boxGeometry args={[0.012, 0.002, WIDTH - 2 * WALL]} />
      <Surface color="#f3f1ec" roughness={0.9} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh
        key={`long${side}`}
        position={[0, HEIGHT - 0.09, side * (WIDTH / 2 - WALL / 2)]}
        castShadow
      >
        <boxGeometry args={[LENGTH, 0.18, WALL]} />
        <Surface color={color} roughness={0.6} />
      </mesh>
    ))}
    {[-1, 1].map((side) => (
      <group key={`end${side}`} position={[side * (LENGTH / 2 - WALL / 2), HEIGHT - 0.09, 0]}>
        <mesh castShadow>
          <boxGeometry args={[WALL, 0.18, WIDTH - 2 * WALL]} />
          <Surface color={color} roughness={0.6} />
        </mesh>
        {/* Goal mouth */}
        <mesh position={[-side * 0.0035, -0.04, 0]}>
          <boxGeometry args={[WALL, 0.06, 0.2]} />
          <Surface color="#2c313c" roughness={0.8} />
        </mesh>
      </group>
    ))}
    {/* Rods: across the table and out both sides, a handle on the player's end */}
    {RODS.map(([x, team, players]) => (
      <group key={x} position={[x, HEIGHT - 0.07, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.008, 0.008, WIDTH + 0.24, 6]} />
          <Surface color={STEEL} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, (team ? 1 : -1) * (WIDTH / 2 + 0.1)]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.1, 8]} />
          <Surface color="#2c313c" roughness={0.6} />
        </mesh>
        {Array.from({ length: players }, (_, i) => (
          <mesh
            key={i}
            position={[0, -0.03, (i - (players - 1) / 2) * ((WIDTH - 0.2) / Math.max(players, 2))]}
            castShadow
          >
            <boxGeometry args={[0.025, 0.08, 0.035]} />
            <Surface color={TEAMS[team]} roughness={0.5} />
          </mesh>
        ))}
      </group>
    ))}
    {/* The ball */}
    <mesh position={[0.1, HEIGHT - 0.145, 0.08]}>
      <sphereGeometry args={[0.017, 10, 8]} />
      <Surface color="#f3f1ec" roughness={0.5} />
    </mesh>
  </group>
)
