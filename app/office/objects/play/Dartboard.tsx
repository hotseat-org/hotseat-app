import { WALL_FACE } from "../wallItem"
import { Surface } from "~/editor/kit"

interface Props {
  /** The board's surround. */
  color?: string
}

const HANG_HEIGHT = 0.9
const RADIUS = 0.2
const SECTORS = 20
const SECTOR = (Math.PI * 2) / SECTORS
const DARK = "#2c313c"
const LIGHT = "#efe2c4"
const RED = "#c9564f"
const GREEN = "#5f9a5a"

/** A dartboard on a cork backboard: twenty sectors, the double and treble rings, a bull — and a dart in it. */
export const Dartboard = ({ color = "#2c313c" }: Props) => (
  <group position={[0, HANG_HEIGHT, WALL_FACE]}>
    {/* Cork backboard */}
    <mesh position={[0, 0, 0.012]} castShadow>
      <boxGeometry args={[0.6, 0.6, 0.024]} />
      <Surface color="#b98a5a" roughness={0.95} />
    </mesh>
    {/* Surround */}
    <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[RADIUS + 0.035, RADIUS + 0.035, 0.03, 32]} />
      <Surface color={color} roughness={0.8} />
    </mesh>
    <group position={[0, 0, 0.046]}>
      {/* Sectors */}
      {Array.from({ length: SECTORS }, (_, i) => (
        <mesh key={i}>
          <circleGeometry args={[RADIUS, 2, i * SECTOR - SECTOR / 2, SECTOR]} />
          <Surface color={i % 2 ? LIGHT : DARK} roughness={0.9} />
        </mesh>
      ))}
      {/* Double and treble rings, then the bull */}
      {[RADIUS - 0.012, RADIUS * 0.6].map((radius) =>
        Array.from({ length: SECTORS }, (_, i) => (
          <mesh key={`${radius}${i}`} position={[0, 0, 0.001]}>
            <ringGeometry args={[radius - 0.012, radius, 2, 1, i * SECTOR - SECTOR / 2, SECTOR]} />
            <Surface color={i % 2 ? GREEN : RED} roughness={0.9} />
          </mesh>
        ))
      )}
      <mesh position={[0, 0, 0.002]}>
        <circleGeometry args={[0.024, 16]} />
        <Surface color={GREEN} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <circleGeometry args={[0.01, 12]} />
        <Surface color={RED} roughness={0.9} />
      </mesh>
      {/* A dart, near the treble twenty */}
      <group position={[0.03, 0.11, 0]} rotation={[0.35, -0.2, 0]}>
        <mesh position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.002, 0.08, 6]} />
          <Surface color="#b9bcc4" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.09]}>
          <boxGeometry args={[0.03, 0.002, 0.03]} />
          <Surface color="#e8c07a" roughness={0.6} />
        </mesh>
      </group>
    </group>
  </group>
)
