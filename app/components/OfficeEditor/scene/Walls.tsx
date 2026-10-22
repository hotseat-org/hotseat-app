import { useMemo } from "react"
import { BoxGeometry, BufferGeometry } from "three"
import { useEditorStore } from "../store"
import { useSurfaces } from "../sceneTheme"
import { GhostContext, Surface, type GhostMode } from "../objects/Surface"
import { SEG, edgeKey, unitEdges } from "../layout"
import { WALL } from "../objects/dimensions"
import { GlassRun } from "../objects/GlassWall"
import { DEFAULT_COLOR } from "../palette"
import { isEdgeType, type SceneObject } from "../types"
import { useXray } from "./xray"

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

  const xray = useXray()
  const allWalls = useMemo(() => objects.filter((o) => o.type === "wall"), [objects])
  // Segments in the cursor cutaway are split off into their own (fading) runs;
  // the rest merge into seamless solid runs as usual.
  const walls = useMemo(() => allWalls.filter((w) => !xray.active.has(w.id)), [allWalls, xray])
  const fading = useMemo(() => allWalls.filter((w) => xray.active.has(w.id)), [allWalls, xray])
  const wallColor = useSurfaces().wall
  const runs = useMemo(() => buildRuns(walls, wallColor), [walls, wallColor])
  // Unit edges taken by any wall/door/window — to know where a cut slice has
  // a neighbour (no end face needed) or is a free wall end (needs one).
  // (Keyed to the owning piece, so a slice can read its neighbours' cut depth.)
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of objects)
      if (isEdgeType(o.type)) for (const e of unitEdges(o)) map.set(edgeKey(e), o.id)
    return map
  }, [objects])
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
      {runs.map((r) => (
        <WallRun key={r.key} run={r} />
      ))}

      {/* The cutaway section: each segment sinks on its own fade, so sliding
          along a wall rolls the cut with the cursor (a merged run could only
          follow its most-cut segment, so the section jumped). */}
      {fading.map((w) => (
        <WallSlice
          key={w.id}
          wall={w}
          color={w.color ?? wallColor}
          owners={owners}
          fade={xray.fade}
        />
      ))}

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

/** One merged straight run of wall as a single box. */
const WallRun = ({ run: r }: { run: Run }) => {
  // Sink the base slightly below the floor so there's no bright contact gap.
  const h = WALL.height + WALL.sink
  const body: [number, number, number] =
    r.axis === "x" ? [r.length, h, WALL.depth] : [WALL.depth, h, r.length]
  const pos: [number, number, number] =
    r.axis === "x" ? [r.center, 0, r.fixed] : [r.fixed, 0, r.center]
  return (
    <group position={pos}>
      <mesh position={[0, (WALL.height - WALL.sink) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={body} />
        <Surface color={r.color} roughness={0.85} isRecessed />
      </mesh>
    </group>
  )
}

/**
 * Box geometry for one wall segment along local X, without end faces on the
 * sides that butt against another segment: neighbouring slices cut to (nearly)
 * the same height then read as one wall, with no seam lines across the cut.
 * A free wall end keeps its face. (BoxGeometry groups: +x, −x, +y, −y, +z, −z.)
 */
const slices = new Map<string, BufferGeometry>()
const sliceGeometry = (startCap: boolean, endCap: boolean) => {
  const key = `${startCap}${endCap}`
  const cached = slices.get(key)
  if (cached) return cached
  const box = new BoxGeometry(SEG, WALL.height + WALL.sink, WALL.depth)
  box.translate(0, (WALL.height - WALL.sink) / 2, 0)
  const index = box.getIndex()
  if (!index) return box
  const keep: number[] = []
  box.groups.forEach((g, i) => {
    if ((i === 0 && !endCap) || (i === 1 && !startCap)) return
    for (let k = g.start; k < g.start + g.count; k++) keep.push(index.getX(k))
  })
  const geo = new BufferGeometry()
  geo.setAttribute("position", box.getAttribute("position"))
  geo.setAttribute("normal", box.getAttribute("normal"))
  geo.setAttribute("uv", box.getAttribute("uv"))
  geo.setIndex(keep)
  slices.set(key, geo)
  return geo
}

/**
 * One wall segment in the cutaway. Its cut slopes between the depths at its
 * two joints — each joint the average of the segments meeting there — so the
 * cut section is one continuous curve rather than half-metre steps.
 */
const WallSlice = ({
  wall,
  color,
  owners,
  fade,
}: {
  wall: SceneObject
  color: string
  owners: Map<string, string>
  fade: (id: string) => number
}) => {
  const alongX = isXWall(wall)
  const along = alongX ? wall.x : wall.z
  // Local +X runs along the wall: world +X, or world +Z (turned −90°).
  const at = (d: number) =>
    edgeKey({
      x: alongX ? wall.x + d : wall.x,
      z: alongX ? wall.z : wall.z + d,
      rotation: wall.rotation,
    })
  const prev = owners.get(at(-SEG))
  const next = owners.get(at(SEG))
  const geometry = sliceGeometry(!prev, !next)
  const ghost = useMemo<GhostMode>(() => {
    const own = () => fade(wall.id)
    // A free end has no neighbour to meet: it keeps its own depth.
    const joint = (other?: string) => (other ? (own() + fade(other)) / 2 : own())
    return {
      xray: own,
      ramp: {
        axis: alongX ? "x" : "z",
        from: along - SEG / 2,
        to: along + SEG / 2,
        ends: () => [joint(prev), joint(next)],
      },
    }
  }, [fade, wall.id, alongX, along, prev, next])
  return (
    <GhostContext.Provider value={ghost}>
      <mesh
        position={[wall.x, 0, wall.z]}
        rotation={[0, alongX ? 0 : -Math.PI / 2, 0]}
        geometry={geometry}
        castShadow
        receiveShadow
      >
        <Surface color={color} roughness={0.85} isRecessed />
      </mesh>
    </GhostContext.Provider>
  )
}
