import { Surface } from "~/editor/kit"

interface Props {
  /** The playing surface's colour. */
  color?: string
}

const LENGTH = 2.74
const WIDTH = 1.525
const HEIGHT = 0.76
const TOP = 0.03
const LINE = "#f3f1ec"
const FRAME = "#3d4657"

/** A ping-pong table: the top with its white lines, the net, a frame of legs, two bats and a ball. */
export const PingPongTable = ({ color = "#3f6a9a" }: Props) => (
  <group>
    {/* Top */}
    <mesh position={[0, HEIGHT - TOP / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[LENGTH, TOP, WIDTH]} />
      <Surface color={color} roughness={0.6} />
    </mesh>
    {/* Edge lines and the centre line */}
    {[
      [0, -WIDTH / 2 + 0.01, LENGTH, 0.02],
      [0, WIDTH / 2 - 0.01, LENGTH, 0.02],
      [-LENGTH / 2 + 0.01, 0, 0.02, WIDTH],
      [LENGTH / 2 - 0.01, 0, 0.02, WIDTH],
      [0, 0, LENGTH, 0.006],
    ].map(([x, z, length, width], i) => (
      <mesh key={i} position={[x, HEIGHT + 0.001, z]}>
        <boxGeometry args={[length, 0.002, width]} />
        <Surface color={LINE} roughness={0.6} />
      </mesh>
    ))}
    {/* Net and its posts */}
    <mesh position={[0, HEIGHT + 0.076, 0]}>
      <boxGeometry args={[0.006, 0.15, WIDTH + 0.3]} />
      <Surface color="#2c313c" roughness={0.9} opacity={0.75} />
    </mesh>
    <mesh position={[0, HEIGHT + 0.15, 0]}>
      <boxGeometry args={[0.012, 0.012, WIDTH + 0.3]} />
      <Surface color={LINE} roughness={0.6} />
    </mesh>
    {/* Legs: two folding frames */}
    {[-1, 1].flatMap((x) =>
      [-1, 1].map((z) => (
        <mesh
          key={`${x}${z}`}
          position={[x * (LENGTH / 2 - 0.35), (HEIGHT - TOP) / 2, z * (WIDTH / 2 - 0.15)]}
          castShadow
        >
          <boxGeometry args={[0.05, HEIGHT - TOP, 0.05]} />
          <Surface color={FRAME} roughness={0.5} metalness={0.3} />
        </mesh>
      ))
    )}
    {[-1, 1].map((x) => (
      <mesh key={x} position={[x * (LENGTH / 2 - 0.35), 0.12, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, WIDTH - 0.3]} />
        <Surface color={FRAME} roughness={0.5} metalness={0.3} />
      </mesh>
    ))}
    {/* Two bats and a ball, left on the table */}
    {(
      [
        [-0.9, 0.4, 0.4, "#c9564f"],
        [0.85, -0.35, -2.4, "#2c313c"],
      ] as [number, number, number, string][]
    ).map(([x, z, turn, rubber]) => (
      <group key={x} position={[x, HEIGHT + 0.006, z]} rotation={[0, turn, 0]}>
        <mesh>
          <cylinderGeometry args={[0.075, 0.075, 0.01, 16]} />
          <Surface color={rubber} roughness={0.7} />
        </mesh>
        <mesh position={[0.11, 0, 0]}>
          <boxGeometry args={[0.1, 0.02, 0.03]} />
          <Surface color="#c9946a" roughness={0.6} />
        </mesh>
      </group>
    ))}
    <mesh position={[0.3, HEIGHT + 0.02, 0.25]}>
      <sphereGeometry args={[0.02, 10, 8]} />
      <Surface color="#f3a65a" roughness={0.5} />
    </mesh>
  </group>
)
