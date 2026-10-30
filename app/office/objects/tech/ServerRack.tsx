import { ACCENT } from "~/editor/palette"
import { RoundedBox } from "~/editor/objects/RoundedBox"
import { Surface } from "~/editor/objects/Surface"

interface Props {
  color?: string
}

const WIDTH = 0.62
const DEPTH = 0.9
const HEIGHT = 1.9
const UNITS = 9
/** Depth of the open front bay: servers at its back, the glass door at its front. */
const RECESS = 0.06
const LED_GREEN = "#6ee7a0"

/**
 * A 42U server rack: a dark cabinet with a tinted glass front, a stack of
 * servers behind it with glowing status LEDs, and vented top. Faces +Z.
 */
export const ServerRack = ({ color = "#2c313c" }: Props) => {
  const unitH = (HEIGHT - 0.24) / UNITS

  return (
    <group>
      {/* Cabinet body, stopping short of the front so the servers show */}
      <RoundedBox
        args={[WIDTH, HEIGHT, DEPTH - RECESS]}
        radius={0.02}
        smoothness={3}
        position={[0, HEIGHT / 2, -RECESS / 2]}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.5} metalness={0.3} />
      </RoundedBox>
      {/* Front frame around the open bay: the posts run between the top and
          bottom rails, not behind them (they'd share their faces) */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (WIDTH / 2 - 0.02), HEIGHT / 2, DEPTH / 2 - RECESS / 2]}
          castShadow
        >
          <boxGeometry args={[0.04, HEIGHT - 0.2, RECESS]} />
          <Surface color={color} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {[0.05, HEIGHT - 0.05].map((y) => (
        <mesh key={y} position={[0, y, DEPTH / 2 - RECESS / 2]} castShadow>
          <boxGeometry args={[WIDTH, 0.1, RECESS]} />
          <Surface color={color} roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Servers, recessed behind the door */}
      {Array.from({ length: UNITS }, (_, i) => {
        const y = 0.12 + unitH * (i + 0.5)

        return (
          <group key={i} position={[0, y, DEPTH / 2 - RECESS + 0.01]}>
            <mesh>
              <boxGeometry args={[WIDTH - 0.1, unitH - 0.03, 0.02]} />
              <Surface color="#3d4657" roughness={0.45} metalness={0.4} />
            </mesh>
            {[0, 1, 2].map((unit) => (
              <mesh key={unit} position={[WIDTH / 2 - 0.1 - unit * 0.04, 0, 0.012]}>
                <boxGeometry args={[0.018, 0.018, 0.005]} />
                <Surface
                  color={unit === 0 && i % 3 === 1 ? ACCENT : LED_GREEN}
                  emissive={unit === 0 && i % 3 === 1 ? ACCENT : LED_GREEN}
                  emissiveIntensity={1.4}
                />
              </mesh>
            ))}
            {/* Drive-bay slits */}
            <mesh position={[-0.06, 0, 0.011]}>
              <boxGeometry args={[WIDTH * 0.45, 0.012, 0.004]} />
              <Surface color="#20242e" roughness={0.6} />
            </mesh>
          </group>
        )
      })}
      {/* Tinted glass door + handle */}
      <mesh position={[0, HEIGHT / 2, DEPTH / 2 - 0.006]}>
        <boxGeometry args={[WIDTH - 0.06, HEIGHT - 0.1, 0.01]} />
        <Surface color="#1b2330" roughness={0.1} metalness={0.3} opacity={0.35} />
      </mesh>
      <mesh position={[WIDTH / 2 - 0.08, HEIGHT / 2, DEPTH / 2 + 0.012]} castShadow>
        <boxGeometry args={[0.02, 0.24, 0.03]} />
        <Surface color="#b9bcc4" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Top vent */}
      {[-0.2, -0.1, 0, 0.1, 0.2].map((z) => (
        <mesh key={z} position={[0, HEIGHT + 0.002, z]}>
          <boxGeometry args={[WIDTH - 0.16, 0.004, 0.04]} />
          <Surface color="#20242e" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}
