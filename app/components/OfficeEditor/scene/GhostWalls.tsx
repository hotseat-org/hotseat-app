import { useLayoutEffect, useMemo, useRef } from "react"
import type { Group } from "three"
import { GlassRun } from "../objects/GlassWall"
import { GhostContext, Surface, type GhostMode } from "../objects/Surface"
import { WALL } from "../objects/dimensions"
import { useSurfaces } from "../sceneTheme"
import type { SceneObject, WallCell } from "../types"
import { buildRuns, type Run } from "./Walls"

interface Props {
  /** The wall (or glass wall) segments to preview. */
  edges: (WallCell & {
    type: "wall" | "glassWall"
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
        .filter((e) => e.type === type)
        .map(
          (e, i): SceneObject => ({
            ...e,
            id: String(i),
            color: e.tint ? TINT + e.tint : TRANSLUCENT + (e.color ?? ""),
          })
        )
    return [
      ...buildRuns(asObjects("wall"), TRANSLUCENT).map((r) => ({ ...r, isGlass: false })),
      ...buildRuns(asObjects("glassWall"), TRANSLUCENT).map((r) => ({ ...r, isGlass: true })),
    ]
  }, [edges])
  return (
    <>
      {runs.map((r) => (
        <GhostRun key={`${r.isGlass}|${r.key}`} run={r} grow={grow} />
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
    ref.current?.traverse((o) => {
      o.castShadow = false
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
