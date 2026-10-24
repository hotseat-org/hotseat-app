import { PALETTE } from "../palette"
import { useSurfaces } from "../sceneTheme"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"
import { WALL, FLUSH_INSET } from "./dimensions"

interface Props {
  color?: string
}

const POST = 0.13
const OPENING = WALL.width - POST * 2

/** A wall-height frame with an open, slightly-ajar painted door panel + handle. */
export const Door = ({ color = PALETTE.door }: Props) => {
  const postX = WALL.width / 2 - POST / 2
  // The frame is part of the wall, so it follows the themed wall colour.
  const frame = useSurfaces().wall
  return (
    <group>
      {/* Side posts */}
      {[-postX, postX].map((x) => (
        <RoundedBox
          key={x}
          // A hair inside the lintel's front, back, top and end faces, which
          // they'd otherwise share (FLUSH_INSET).
          args={[POST - FLUSH_INSET, WALL.height - FLUSH_INSET, WALL.depth - 2 * FLUSH_INSET]}
          radius={0.03}
          smoothness={4}
          position={[x - Math.sign(x) * (FLUSH_INSET / 2), (WALL.height - FLUSH_INSET) / 2, 0]}
          castShadow
          receiveShadow
        >
          <Surface color={frame} roughness={0.85} />
        </RoundedBox>
      ))}
      {/* Lintel */}
      <RoundedBox
        args={[WALL.width, 0.16, WALL.depth]}
        radius={0.03}
        smoothness={4}
        position={[0, WALL.height - 0.08, 0]}
        castShadow
      >
        <Surface color={frame} roughness={0.85} />
      </RoundedBox>
      {/* Ajar door panel, hinged on the left post */}
      <group position={[-OPENING / 2, 0, 0]} rotation={[0, Math.PI / 5, 0]}>
        <RoundedBox
          args={[OPENING, WALL.height - 0.2, 0.06]}
          radius={0.02}
          smoothness={4}
          position={[OPENING / 2, (WALL.height - 0.2) / 2, 0.05]}
          castShadow
          receiveShadow
        >
          <Surface color={color} roughness={0.7} />
        </RoundedBox>
        {/* Handle */}
        <mesh position={[OPENING - 0.12, WALL.height / 2 - 0.1, 0.12]} castShadow>
          <sphereGeometry args={[0.045, 10, 8]} />
          <Surface color={PALETTE.doorHandle} roughness={0.4} metalness={0.3} />
        </mesh>
      </group>
    </group>
  )
}
