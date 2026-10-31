import { useLayoutEffect, useMemo, useRef } from "react"
import type { Group } from "three"
import { GlassRun } from "../objects/GlassWall"
import { GhostContext, Surface, type GhostMode } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../scene/sceneTheme"
import type { SceneObject, WallCell, WallType } from "../types"
import { buildRuns, type Run } from "../walls/Walls"
import { GhostObject } from "./GhostObject"

interface Props {
  /** The wall segments to preview (walls and glass merged into runs; other items piece by piece). */
  edges: (WallCell & {
    type: WallType
    /** Its own colour, for a translucent ghost (a saved room's painted walls). */
    color?: string
    /** A flat tint instead (blocked, erased). */
    tint?: string
  })[]
  /** How far (m) a tinted ghost stands proud of the walls it covers. */
  grow?: number
}

/** A run's look, as the colour key runs merge by: a tint, or a translucent colour. */
const TINT = "tint:"
const TRANSLUCENT = "translucent:"

/**
 * A preview of wall segments, merged into straight runs like placed walls —
 * one piece per run, never a box per half-metre segment (no seams, no darker
 * overlaps). Tinted segments (blocked, erased) form runs of their own.
 */
export const GhostWalls = ({ edges, grow = 0 }: Props) => {
  const runs = useMemo(() => {
    const asObjects = (type: "wall" | "glassWall") =>
      edges
        .filter((edge) => edge.type === type)
        .map(
          (edge, i): SceneObject => ({
            ...edge,
            id: String(i),
            color: edge.tint ? TINT + edge.tint : TRANSLUCENT + (edge.color ?? ""),
          })
        )

    return [
      ...buildRuns(asObjects("wall"), TRANSLUCENT).map((run) => ({ ...run, isGlass: false })),
      ...buildRuns(asObjects("glassWall"), TRANSLUCENT).map((run) => ({ ...run, isGlass: true })),
    ]
  }, [edges])
  const pieces = edges.filter((edge) => edge.type !== "wall" && edge.type !== "glassWall")

  return (
    <>
      {runs.map((run) => (
        <GhostRun key={`${run.isGlass}|${run.key}`} run={run} grow={grow} />
      ))}
      {pieces.map((edge, i) => (
        <GhostObject
          key={i}
          type={edge.type}
          x={edge.x}
          z={edge.z}
          rotation={edge.rotation}
          color={edge.color}
          tint={edge.tint}
          scale={1 + grow}
        />
      ))}
    </>
  )
}

const GhostRun = ({ run, grow }: { run: Run & { isGlass: boolean }; grow: number }) => {
  const themed = useSurfaces().wall
  const isTinted = run.color.startsWith(TINT)
  // A tint, or the run's own colour (none = the theme's wall, glass's frame).
  const own = run.color.slice((isTinted ? TINT : TRANSLUCENT).length) || undefined
  const mode = useMemo<GhostMode>(
    () => (isTinted && own ? { tint: own } : "translucent"),
    [isTinted, own]
  )
  // Previews never cast shadows (a cached shadow map would keep them).
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    ref.current?.traverse((object) => {
      object.castShadow = false
    })
  })
  const margin = isTinted ? grow : 0

  return (
    <GhostContext.Provider value={mode}>
      <group ref={ref} position={[run.x, 0, run.z]} rotation={[0, run.rotation, 0]}>
        {run.isGlass ? (
          <GlassRun length={run.length} color={own} />
        ) : (
          <mesh position={[0, (WALL.height - WALL.sink + margin) / 2, 0]}>
            <boxGeometry
              args={[
                run.length + 2 * margin,
                WALL.height + WALL.sink + margin,
                WALL.depth + 2 * margin,
              ]}
            />
            <Surface color={own ?? themed} roughness={0.85} />
          </mesh>
        )}
      </group>
    </GhostContext.Provider>
  )
}
