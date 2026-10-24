import { useEffect, useMemo } from "react"
import { BoxGeometry, Vector3 } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { useEditorStore } from "../store"
import { useSurfaces } from "../sceneTheme"
import { Surface } from "../objects/Surface"
import { SEG } from "../layout"
import { WALL } from "../objects/dimensions"
import { GlassRun } from "../objects/GlassWall"
import { DEFAULT_COLOR } from "../palette"
import { type SceneObject } from "../types"
import { CutawayContext, setCutAttributes } from "./cutaway"

interface Run {
  key: string
  axis: "x" | "z"
  color: string
  /** Centre along the run axis. */
  center: number
  /** The perpendicular (fixed) coordinate. */
  fixed: number
  length: number
  /** The segments merged into this run. */
  ids: string[]
}

const isXWall = (o: SceneObject) =>
  Math.abs(((o.rotation % Math.PI) + Math.PI) % Math.PI) < Math.PI / 4

/**
 * Merge wall segments into maximal straight runs of the same orientation and
 * colour, so a run renders as ONE continuous mesh (no per-segment seams).
 */
const buildRuns = (walls: SceneObject[], defaultColor: string): Run[] => {
  const groups = new Map<string, SceneObject[]>()
  for (const w of walls) {
    const axis = isXWall(w) ? "x" : "z"
    const fixed = axis === "x" ? w.z : w.x
    const color = w.color ?? defaultColor
    const gk = `${axis}|${fixed}|${color}`
    const arr = groups.get(gk)
    if (arr) arr.push(w)
    else groups.set(gk, [w])
  }

  const runs: Run[] = []
  for (const [gk, segs] of groups) {
    const [axis, fixedStr, color] = gk.split("|")
    const fixed = Number(fixedStr)
    const along = (w: SceneObject) => (axis === "x" ? w.x : w.z)
    segs.sort((a, b) => along(a) - along(b))

    let start = 0
    for (let i = 1; i <= segs.length; i++) {
      const contiguous = i < segs.length && along(segs[i]) - along(segs[i - 1]) === SEG
      if (!contiguous) {
        const first = along(segs[start])
        const last = along(segs[i - 1])
        runs.push({
          key: `${gk}|${first}`,
          axis: axis as "x" | "z",
          color,
          center: (first + last) / 2,
          fixed,
          length: last - first + SEG,
          ids: segs.slice(start, i).map((w) => w.id),
        })
        start = i
      }
    }
  }
  return runs
}

/**
 * Placed walls are not selectable: a click on a wall falls through to the floor
 * (deselecting, like any empty spot). Walls are edited with the Wall / Door /
 * Erase tools, which BuildController handles.
 */
export const Walls = () => {
  const objects = useEditorStore((s) => s.objects)

  const walls = useMemo(() => objects.filter((o) => o.type === "wall"), [objects])
  const wallColor = useSurfaces().wall
  // The cursor cutaway slices these runs in their shader (see cutaway.ts):
  // they stay whole, however the cut moves.
  const runs = useMemo(() => buildRuns(walls, wallColor), [walls, wallColor])
  // Glass partitions merge the same way. They never trigger the cutaway —
  // you can see through them already.
  const glassRuns = useMemo(
    () =>
      buildRuns(
        objects.filter((o) => o.type === "glassWall"),
        DEFAULT_COLOR.glassWall
      ),
    [objects]
  )

  return (
    <group>
      <WallRuns runs={runs} />

      {glassRuns.map((r) => (
        <group
          key={r.key}
          position={r.axis === "x" ? [r.center, 0, r.fixed] : [r.fixed, 0, r.center]}
          rotation={[0, r.axis === "x" ? 0 : Math.PI / 2, 0]}
        >
          <GlassRun length={r.length} color={r.color} />
        </group>
      ))}
    </group>
  )
}

/**
 * Every run of one colour as ONE mesh (a draw call per wall colour, not per
 * run). Each run's vertices carry its anchor and direction, which the cutaway
 * reads in place of a per-run transform (see cutaway.ts).
 */
const WallRuns = ({ runs }: { runs: Run[] }) => {
  const meshes = useMemo(() => {
    const byColor = new Map<string, Run[]>()
    for (const r of runs) byColor.set(r.color, [...(byColor.get(r.color) ?? []), r])
    return [...byColor].map(([color, colorRuns]) => {
      const parts = colorRuns.map(runGeometry)
      const geometry = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      return { color, geometry }
    })
  }, [runs])
  useEffect(() => () => meshes.forEach((m) => m.geometry?.dispose()), [meshes])
  return (
    <CutawayContext.Provider value="mergedWall">
      {meshes.map(
        (m) =>
          m.geometry && (
            <mesh key={m.color} geometry={m.geometry} castShadow receiveShadow>
              <Surface color={m.color} roughness={0.85} isRecessed />
            </mesh>
          )
      )}
    </CutawayContext.Provider>
  )
}

/** One straight run as a box, along its axis, with its anchor for the cutaway. */
const runGeometry = (r: Run) => {
  // Sink the base slightly below the floor so there's no bright contact gap.
  const box = new BoxGeometry(r.length, WALL.height + WALL.sink, WALL.depth)
  box.translate(0, (WALL.height - WALL.sink) / 2, 0)
  if (r.axis === "z") box.rotateY(-Math.PI / 2)
  const anchor =
    r.axis === "x" ? new Vector3(r.center, 0, r.fixed) : new Vector3(r.fixed, 0, r.center)
  box.translate(anchor.x, 0, anchor.z)
  return setCutAttributes(box, anchor, r.axis === "x" ? 0 : 1)
}
