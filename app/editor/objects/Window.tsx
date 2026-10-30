import { useSurfaces } from "../sceneTheme"
import { Surface } from "./Surface"
import { WALL, FLUSH_INSET } from "./dimensions"

interface Props {
  /** Frame colour. */
  color?: string
  /** The wall below and above it: its paint, each face (undefined = themed). */
  wallFront?: string
  wallBack?: string
}

/** Window opening, in wall-local heights (the wall is WALL.height = 1.4 tall). */
const SILL = 0.55
const HEAD = 1.2
const WIDTH = WALL.width // 1 unit: two wall half-segments
const FRAME = 0.05
const FRAME_D = WALL.depth + 0.03

/**
 * A 1-unit window cut into a wall: solid wall below the sill and above the
 * head (themed like the walls), a painted frame with a centre mullion, and
 * glass. The glass casts NO shadow, so sunlight falls through onto the floor.
 */
export const Window = ({ color = "#f4efe6", wallFront, wallBack }: Props) => {
  const themed = useSurfaces().wall
  const front = wallFront ?? themed
  const back = wallBack ?? themed
  const glassH = HEAD - SILL
  return (
    <group>
      {/* Wall below the sill (sunk like the walls, no contact gap); its top
          stays under the sill ledge's, not level with it (FLUSH_INSET) */}
      <WallPiece
        y={(SILL - FLUSH_INSET - WALL.sink) / 2}
        height={SILL - FLUSH_INSET + WALL.sink}
        front={front}
        back={back}
      />
      {/* Wall above the head */}
      <WallPiece
        y={(HEAD + WALL.height) / 2}
        height={WALL.height - HEAD}
        front={front}
        back={back}
      />

      {/* Frame: sill, head, two jambs and a centre mullion */}
      {[SILL + FRAME / 2, HEAD - FRAME / 2].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <boxGeometry args={[WIDTH, FRAME, FRAME_D]} />
          <Surface color={color} roughness={0.5} />
        </mesh>
      ))}
      {[-(WIDTH / 2 - FRAME / 2), 0, WIDTH / 2 - FRAME / 2].map((x) => (
        <mesh key={x} position={[x, (SILL + HEAD) / 2, 0]} castShadow>
          {/* Between the sill and head bars, not through them: they'd share
              their faces (z-fighting) */}
          <boxGeometry args={[x === 0 ? FRAME * 0.7 : FRAME, glassH - FRAME * 2, FRAME_D]} />
          <Surface color={color} roughness={0.5} />
        </mesh>
      ))}
      {/* Protruding sill ledge */}
      <mesh position={[0, SILL - 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[WIDTH + 0.04, 0.03, WALL.depth + 0.12]} />
        <Surface color={color} roughness={0.5} />
      </mesh>

      {/* Glass — no shadow, so daylight streams through */}
      <mesh position={[0, (SILL + HEAD) / 2, 0]}>
        <boxGeometry args={[WIDTH - FRAME * 2, glassH - FRAME * 2, 0.02]} />
        <Surface color="#bfe0ee" roughness={0.05} metalness={0.2} opacity={0.3} />
      </mesh>
    </group>
  )
}

/** A band of wall round the window: one piece, or two back to back when its faces differ. */
const WallPiece = ({
  y,
  height,
  front,
  back,
}: {
  y: number
  height: number
  front: string
  back: string
}) =>
  front === back ? (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[WIDTH, height, WALL.depth]} />
      <Surface color={front} roughness={0.85} />
    </mesh>
  ) : (
    <>
      {(
        [
          [front, 1],
          [back, -1],
        ] as const
      ).map(([color, side]) => (
        <mesh key={side} position={[0, y, (side * WALL.depth) / 4]} castShadow receiveShadow>
          <boxGeometry args={[WIDTH, height, WALL.depth / 2]} />
          <Surface color={color} roughness={0.85} />
        </mesh>
      ))}
    </>
  )
