import { Surface } from "./Surface"
import { WALL_FACE } from "./wallItem"

interface Props {
  /** Rim colour. */
  color?: string
}

const RADIUS = 0.17
const HANG_HEIGHT = 1.06

/** A round wall clock (showing ten past ten, like every clock in a catalogue). */
export const WallClock = ({ color = "#3d4657" }: Props) => (
  <group position={[0, HANG_HEIGHT, WALL_FACE]}>
    <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[RADIUS, RADIUS, 0.04, 28]} />
      <Surface color={color} roughness={0.5} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0, 0.041]}>
      <circleGeometry args={[RADIUS - 0.02, 28]} />
      <Surface color="#fbfaf6" roughness={0.6} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2
      return (
        <mesh
          key={i}
          position={[Math.sin(angle) * (RADIUS - 0.04), Math.cos(angle) * (RADIUS - 0.04), 0.043]}
          rotation={[0, 0, -angle]}
        >
          <planeGeometry args={[0.008, i % 3 ? 0.012 : 0.024]} />
          <Surface color="#3d4657" roughness={0.6} />
        </mesh>
      )
    })}
    {/* Hands: hour (10) and minute (2) */}
    {(
      [
        [-(Math.PI * 2 * 10) / 12, 0.07, 0.012],
        [-(Math.PI * 2 * 2) / 12, 0.11, 0.008],
      ] as [number, number, number][]
    ).map(([angle, length, width], i) => (
      <mesh
        key={i}
        position={[
          (Math.sin(-angle) * length) / 2,
          (Math.cos(-angle) * length) / 2,
          0.045 + i * 0.002,
        ]}
        rotation={[0, 0, angle]}
      >
        <planeGeometry args={[width, length]} />
        <Surface color="#20242e" roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, -0.001, 0.048]}>
      <circleGeometry args={[0.012, 12]} />
      <Surface color="#c9564f" roughness={0.5} />
    </mesh>
  </group>
)
