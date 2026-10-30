import { PALETTE } from "../palette"
import { RoundedBox } from "./RoundedBox"
import { Surface } from "./Surface"
import { WALL, FLUSH_INSET } from "./dimensions"

const POST = 0.13
const OPENING = WALL.width - POST * 2

/**
 * A wall-height wooden door: frame, an open, slightly-ajar panel and a handle.
 * Always wood — a door has no colour of its own (see isRecolorable).
 */
export const Door = () => {
  const postX = WALL.width / 2 - POST / 2
  return (
    <group>
      {/* Side posts — a hair inside the lintel's front, back, top and end
          faces, which they'd otherwise share (FLUSH_INSET) */}
      {[-postX, postX].map((x) => (
        <FramePiece
          key={x}
          size={[POST - FLUSH_INSET, WALL.height - FLUSH_INSET, WALL.depth - 2 * FLUSH_INSET]}
          position={[x - Math.sign(x) * (FLUSH_INSET / 2), (WALL.height - FLUSH_INSET) / 2]}
        />
      ))}
      {/* Lintel */}
      <FramePiece size={[WALL.width, 0.16, WALL.depth]} position={[0, WALL.height - 0.08]} />
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
          <Surface color={PALETTE.doorLeaf} roughness={0.7} />
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

/** A piece of the wooden frame (never painted with the wall). */
const FramePiece = ({
  size,
  position: [x, y],
}: {
  size: [number, number, number]
  position: [number, number]
}) => (
  <RoundedBox
    args={size}
    radius={0.03}
    smoothness={4}
    position={[x, y, 0]}
    castShadow
    receiveShadow
  >
    <Surface color={PALETTE.doorFrame} roughness={0.7} />
  </RoundedBox>
)
