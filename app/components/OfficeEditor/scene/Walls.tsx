import { useEffect, useMemo } from "react"
import { BoxGeometry, Matrix4, Vector3, type BufferGeometry } from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { useObjectsWithPaintPreview } from "../store"
import { useSurfaces } from "../sceneTheme"
import { Surface } from "../objects/Surface"
import {
  EDGE_ROTATION,
  SEG,
  edgeDirection,
  edgeLength,
  getWallFacesFrom,
  type EdgeDirection,
} from "../layout"
import { WALL } from "../objects/dimensions"
import { GlassFrameSurface, GlassSurface, getGlassRunParts } from "../objects/GlassWall"
import { DEFAULT_COLOR } from "../palette"
import { type SceneObject } from "../types"
import { CUT_DIRECTION, CutawayContext, setCutAttributes } from "./cutaway"

export interface Run {
  key: string
  direction: EdgeDirection
  /** The rotation its pieces are built with (see EDGE_ROTATION). */
  rotation: number
  /** Its front face's colour (its +Z side, built at `rotation`)… */
  color: string
  /** …and its back's (the same, unless one face is painted apart). */
  back: string
  /** Its middle. */
  x: number
  z: number
  length: number
  /** The segments merged into this run. */
  ids: string[]
}

/**
 * The line a wall segment lies on (fixed along it) and where along it it is —
 * for walls along X, along Z, or diagonal (their lines keep x − z or x + z).
 */
const lineOf = (w: SceneObject) => {
  switch (edgeDirection(w.rotation)) {
    case "x":
      return { line: w.z, along: w.x }
    case "z":
      return { line: w.x, along: w.z }
    case "rising":
      return { line: w.x - w.z, along: w.x }
    case "falling":
      return { line: w.x + w.z, along: w.x }
  }
}

/**
 * Merge wall segments into maximal straight runs of the same direction and
 * colour, so a run renders as ONE continuous mesh (no per-segment seams).
 */
export const buildRuns = (walls: SceneObject[], defaultColor: string): Run[] => {
  // Faces seen the run's way round (a segment may be built turned about).
  const facesOf = (w: SceneObject) => {
    const [front, back] = getWallFacesFrom(w, {
      rotation: EDGE_ROTATION[edgeDirection(w.rotation)],
    })
    return [front ?? defaultColor, back ?? defaultColor] as const
  }
  const groups = new Map<string, SceneObject[]>()
  for (const w of walls) {
    const [front, back] = facesOf(w)
    const gk = `${edgeDirection(w.rotation)}|${lineOf(w).line}|${front}|${back}`
    const arr = groups.get(gk)
    if (arr) arr.push(w)
    else groups.set(gk, [w])
  }

  const runs: Run[] = []
  for (const [gk, segs] of groups) {
    const direction = edgeDirection(segs[0].rotation)
    const [color, back] = facesOf(segs[0])
    const along = (w: SceneObject) => lineOf(w).along
    segs.sort((a, b) => along(a) - along(b))
    const unit = edgeLength({ type: "wall", rotation: segs[0].rotation })

    let start = 0
    for (let i = 1; i <= segs.length; i++) {
      // Consecutive segments are one grid step apart along the run.
      const contiguous = i < segs.length && along(segs[i]) - along(segs[i - 1]) === SEG
      if (!contiguous) {
        const first = segs[start]
        const last = segs[i - 1]
        runs.push({
          key: `${gk}|${along(first)}`,
          direction,
          rotation: EDGE_ROTATION[direction],
          color,
          back,
          x: (first.x + last.x) / 2,
          z: (first.z + last.z) / 2,
          length: (i - start) * unit,
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
  // Hovering with the Paint tool shows its colour on the walls themselves.
  const objects = useObjectsWithPaintPreview()

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

      <GlassRuns runs={glassRuns} />
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
    const byColor = new Map<string, BufferGeometry[]>()
    for (const r of runs)
      for (const { color, geometry } of runGeometries(r))
        byColor.set(color, [...(byColor.get(color) ?? []), geometry])
    return [...byColor].map(([color, parts]) => {
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

/**
 * One straight run as a box, along its axis, with its anchor for the cutaway —
 * or, its faces painted apart, two half-thick slabs back to back.
 */
const runGeometries = (r: Run) => {
  const slabs =
    r.color === r.back
      ? [{ color: r.color, depth: WALL.depth, offset: 0 }]
      : [
          { color: r.color, depth: WALL.depth / 2, offset: WALL.depth / 4 },
          { color: r.back, depth: WALL.depth / 2, offset: -WALL.depth / 4 },
        ]
  const anchor = new Vector3(r.x, 0, r.z)
  return slabs.map(({ color, depth, offset }) => {
    // Sink the base slightly below the floor so there's no bright contact gap.
    const box = new BoxGeometry(r.length, WALL.height + WALL.sink, depth)
    box.translate(0, (WALL.height - WALL.sink) / 2, offset)
    box.rotateY(r.rotation)
    box.translate(anchor.x, 0, anchor.z)
    return { color, geometry: setCutAttributes(box, anchor, CUT_DIRECTION[r.direction]) }
  })
}

/**
 * Every glass run as a handful of meshes: the frames (tracks, rails,
 * mullions) of one colour as one, and all the panes as one — a few draw calls
 * for a whole office's meeting rooms, not one per box.
 */
const GlassRuns = ({ runs }: { runs: Run[] }) => {
  const meshes = useMemo(() => {
    const frames = new Map<string, BufferGeometry[]>()
    const panes: BufferGeometry[] = []
    const place = new Matrix4()
    for (const r of runs) {
      // The run's place: turned to run its way, at its middle.
      place.makeRotationY(r.rotation).setPosition(r.x, 0, r.z)
      for (const part of getGlassRunParts(r.length)) {
        const box = new BoxGeometry(...part.args)
        box.translate(...part.position).applyMatrix4(place)
        if (part.isPane) panes.push(box)
        else frames.set(r.color, [...(frames.get(r.color) ?? []), box])
      }
    }
    const merge = (parts: BufferGeometry[]) => {
      const geometry = parts.length ? mergeGeometries(parts, false) : null
      parts.forEach((p) => p.dispose())
      return geometry
    }
    return {
      frames: [...frames].map(([color, parts]) => ({ color, geometry: merge(parts) })),
      panes: merge(panes),
    }
  }, [runs])
  useEffect(
    () => () => {
      meshes.frames.forEach((f) => f.geometry?.dispose())
      meshes.panes?.dispose()
    },
    [meshes]
  )
  return (
    <>
      {meshes.frames.map(
        (f) =>
          f.geometry && (
            <mesh key={f.color} geometry={f.geometry} castShadow receiveShadow>
              <GlassFrameSurface color={f.color} />
            </mesh>
          )
      )}
      {/* Light falls through the panes: no shadow. */}
      {meshes.panes && (
        <mesh geometry={meshes.panes}>
          <GlassSurface />
        </mesh>
      )}
    </>
  )
}
