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

/** The see-through pane's look: tinted, glossy. */
export const GlassSurface = () => (
  <Surface color="#bfe0ee" roughness={0.05} metalness={0.2} opacity={0.28} />
)

/** The see-through pane: casts no shadow (light falls through). */
export const Glass = ({
  args,
  position,
}: {
  args: [number, number, number]
  position?: [number, number, number]
}) => (
  <mesh position={position}>
    <boxGeometry args={args} />
    <GlassSurface />
  </mesh>
)

/** One box of a glass run, in the run's own space (along X, centred). */
export interface GlassPart {
  args: [number, number, number]
  position: [number, number, number]
  isPane: boolean
}

/**
 * A straight run of glass partition along X, centred on the origin: a slim
 * metal base track and head rail, one continuous pane, and mullions at both
 * ends and every GLASS_BAY between (from the run's start, so bays line up).
 */
export const getGlassRunParts = (length: number): GlassPart[] => {
  const paneH = WALL.height - BASE - HEAD
  const mullions: number[] = []
  for (let offset = 0; offset < length - 1e-6; offset += GLASS_BAY)
    mullions.push(-length / 2 + offset)
  mullions.push(length / 2)
  return [
    {
      args: [length, BASE + WALL.sink, RAIL_D],
      position: [0, (BASE - WALL.sink) / 2, 0],
      isPane: false,
    },
    { args: [length, HEAD, RAIL_D], position: [0, WALL.height - HEAD / 2, 0], isPane: false },
    ...mullions.map(
      (x): GlassPart => ({
        args: [MULLION, paneH, RAIL_D - 0.02],
        position: [x, BASE + paneH / 2, 0],
        isPane: false,
      })
    ),
    { args: [length, paneH, 0.02], position: [0, BASE + paneH / 2, 0], isPane: true },
  ]
}

/** The metal of a glass partition's frame. */
export const GlassFrameSurface = ({ color }: { color: string }) => (
  <Surface color={color} roughness={0.4} metalness={0.4} />
)

/** A run of glass partition as separate meshes (previews; placed runs merge, see scene/Walls). */
export const GlassRun = ({
  length,
  color = PALETTE.seatLeg,
}: {
  length: number
  color?: string
}) => (
  <group>
    {getGlassRunParts(length).map((part, i) =>
      part.isPane ? (
        <Glass key={i} args={part.args} position={part.position} />
      ) : (
        <mesh key={i} position={part.position} castShadow receiveShadow={i === 0}>
          <boxGeometry args={part.args} />
          <GlassFrameSurface color={color} />
        </mesh>
      )
    )}
  </group>
)

interface Props {
  /** Frame colour. */
  color?: string
}

/**
 * One glass-wall segment (catalog preview / build ghost). Placed glass walls
 * render as merged runs in scene/Walls, like solid walls.
 */
export const GlassWall = ({ color }: Props) => <GlassRun length={GRID} color={color} />
