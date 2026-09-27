import { useSurfaces } from "../sceneTheme"
import { Surface } from "./Surface"
import { WALL } from "./dimensions"

interface Props {
  /** Frame colour. */
  color?: string
}

/** Window opening, in wall-local heights (the wall is WALL.height = 1.4 tall). */
const SILL = 0.55
const HEAD = 1.2
const W = WALL.width // 1 unit: two wall half-segments
const FRAME = 0.05
const FRAME_D = WALL.depth + 0.03

/**
 * A 1-unit window cut into a wall: solid wall below the sill and above the
 * head (themed like the walls), a painted frame with a centre mullion, and
 * glass. The glass casts NO shadow, so sunlight falls through onto the floor.
 */
export const Window = ({ color = "#f4efe6" }: Props) => {
  const wall = useSurfaces().wall
  const glassH = HEAD - SILL
  return (
    <group>
      {/* Wall below the sill (sunk like the walls, no contact gap) */}
      <mesh position={[0, (SILL - WALL.sink) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, SILL + WALL.sink, WALL.depth]} />
        <Surface color={wall} roughness={0.85} />
      </mesh>
      {/* Wall above the head */}
      <mesh position={[0, (HEAD + WALL.height) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, WALL.height - HEAD, WALL.depth]} />
        <Surface color={wall} roughness={0.85} />
      </mesh>

      {/* Frame: sill, head, two jambs and a centre mullion */}
      {[SILL + FRAME / 2, HEAD - FRAME / 2].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[W, FRAME, FRAME_D]} />
          <Surface color={color} roughness={0.5} />
        </mesh>
      ))}
      {[-(W / 2 - FRAME / 2), 0, W / 2 - FRAME / 2].map((x) => (
        <mesh key={x} position={[x, (SILL + HEAD) / 2, 0]} castShadow>
          <boxGeometry args={[x === 0 ? FRAME * 0.7 : FRAME, glassH, FRAME_D]} />
          <Surface color={color} roughness={0.5} />
        </mesh>
      ))}
      {/* Protruding sill ledge */}
      <mesh position={[0, SILL - 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.04, 0.03, WALL.depth + 0.12]} />
        <Surface color={color} roughness={0.5} />
      </mesh>

      {/* Glass — no shadow, so daylight streams through */}
      <mesh position={[0, (SILL + HEAD) / 2, 0]}>
        <boxGeometry args={[W - FRAME * 2, glassH - FRAME * 2, 0.02]} />
        <Surface color="#bfe0ee" roughness={0.05} metalness={0.2} opacity={0.3} />
      </mesh>
    </group>
  )
}
