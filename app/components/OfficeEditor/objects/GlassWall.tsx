import { PALETTE } from "../palette"
import { GRID } from "../types"
import { Surface } from "./Surface"
import { WALL } from "./dimensions"

/** Rail (bottom track, top head) and mullion sizes of a glass partition. */
const BASE = 0.08
const HEAD = 0.06
const RAIL_D = 0.08
const MULLION = 0.04
/** Mullions stand this far apart along a run. */
export const GLASS_BAY = 1

/** The see-through pane: tinted, glossy, casts no shadow (light falls through). */
export const Glass = ({
  args,
  position,
}: {
  args: [number, number, number]
  position?: [number, number, number]
}) => (
  <mesh position={position}>
    <boxGeometry args={args} />
    <Surface color="#bfe0ee" roughness={0.05} metalness={0.2} opacity={0.28} />
  </mesh>
)

/**
 * A straight run of glass partition along X, centred on the origin: a slim
 * metal base track and head rail, one continuous pane, and mullions at both
 * ends and every GLASS_BAY between (from the run's start, so bays line up).
 */
export const GlassRun = ({
  length,
  color = PALETTE.seatLeg,
}: {
  length: number
  color?: string
}) => {
  const paneH = WALL.height - BASE - HEAD
  const mullions: number[] = []
  for (let a = 0; a < length - 1e-6; a += GLASS_BAY) mullions.push(-length / 2 + a)
  mullions.push(length / 2)
  return (
    <group>
      <mesh position={[0, (BASE - WALL.sink) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, BASE + WALL.sink, RAIL_D]} />
        <Surface color={color} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, WALL.height - HEAD / 2, 0]} castShadow>
        <boxGeometry args={[length, HEAD, RAIL_D]} />
        <Surface color={color} roughness={0.4} metalness={0.4} />
      </mesh>
      {mullions.map((x) => (
        <mesh key={x} position={[x, BASE + paneH / 2, 0]} castShadow>
          <boxGeometry args={[MULLION, paneH, RAIL_D - 0.02]} />
          <Surface color={color} roughness={0.4} metalness={0.4} />
        </mesh>
      ))}
      <Glass args={[length, paneH, 0.02]} position={[0, BASE + paneH / 2, 0]} />
    </group>
  )
}

interface Props {
  /** Frame colour. */
  color?: string
}

/**
 * One glass-wall segment (catalog preview / build ghost). Placed glass walls
 * render as merged runs in scene/Walls, like solid walls.
 */
export const GlassWall = ({ color }: Props) => <GlassRun length={GRID} color={color} />
