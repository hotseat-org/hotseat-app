import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Glass } from "./GlassWall"
import { FLUSH_INSET } from "./dimensions"
import { Surface } from "./Surface"

interface Props {
  /** Tile colour. */
  color?: string
}

const SIDE = 0.96
const HEIGHT = 1.5
const TRAY = 0.06
const TILE_D = 0.05

/**
 * A 1 × 1 m corner shower: a white tray, tiled back and left walls with a
 * rain head, and a framed glass screen on the open front and right. Faces +Z.
 */
export const Shower = ({ color = "#9fc3c9" }: Props) => {
  const glassH = HEIGHT - TRAY - 0.04
  return (
    <group>
      {/* Tray: just inside the tiled walls' outer faces (FLUSH_INSET) */}
      <RoundedBox
        args={[SIDE - 2 * FLUSH_INSET, TRAY, SIDE - 2 * FLUSH_INSET]}
        radius={0.02}
        smoothness={2}
        position={[0, TRAY / 2, 0]}
        receiveShadow
      >
        <Surface color="#f3f1ec" roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, TRAY + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.05, 20]} />
        <Surface color="#8f9aa6" roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Tiled walls: back (−Z) and left (−X) */}
      <mesh position={[0, HEIGHT / 2, -SIDE / 2 + TILE_D / 2]} castShadow receiveShadow>
        <boxGeometry args={[SIDE, HEIGHT, TILE_D]} />
        <Surface color={color} roughness={0.35} />
      </mesh>
      <mesh position={[-SIDE / 2 + TILE_D / 2, HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[TILE_D, HEIGHT, SIDE - TILE_D * 2]} />
        <Surface color={color} roughness={0.35} />
      </mesh>
      {/* Grout lines on the back wall */}
      {[0.4, 0.75, 1.1].map((y) => (
        <mesh key={y} position={[0, y, -SIDE / 2 + TILE_D + 0.001]}>
          <planeGeometry args={[SIDE, 0.012]} />
          <Surface color="#f3f1ec" roughness={0.6} />
        </mesh>
      ))}

      {/* Rain head on an arm from the back wall, plus a mixer */}
      <mesh
        position={[0, HEIGHT - 0.12, -SIDE / 2 + 0.18]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.012, 0.012, 0.28, 10]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0, HEIGHT - 0.15, -SIDE / 2 + 0.32]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, -SIDE / 2 + TILE_D + 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.04, 16]} />
        <Surface color="#b9bcc4" roughness={0.2} metalness={0.7} />
      </mesh>

      {/* Glass screen: front (+Z) and right (+X), on a slim top rail */}
      <Glass
        args={[SIDE - TILE_D, glassH, 0.02]}
        position={[TILE_D / 2, TRAY + glassH / 2, SIDE / 2 - 0.02]}
      />
      <Glass
        args={[0.02, glassH, SIDE - 0.04]}
        position={[SIDE / 2 - 0.02, TRAY + glassH / 2, 0]}
      />
      <mesh position={[TILE_D / 2, HEIGHT - 0.02, SIDE / 2 - 0.02]} castShadow>
        <boxGeometry args={[SIDE - TILE_D, 0.03, 0.03]} />
        <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[SIDE / 2 - 0.02, HEIGHT - 0.02, 0]} castShadow>
        <boxGeometry args={[0.03, 0.03, SIDE - 0.04]} />
        <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[SIDE / 2 - 0.02, (HEIGHT + TRAY) / 2, SIDE / 2 - 0.02]} castShadow>
        <boxGeometry args={[0.03, HEIGHT - TRAY, 0.03]} />
        <Surface color={PALETTE.seatLeg} roughness={0.35} metalness={0.5} />
      </mesh>
    </group>
  )
}
