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
import { type SceneObject } from "../types"
import { getItem } from "../catalog"
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
const lineOf = (wall: SceneObject) => {
  switch (edgeDirection(wall.rotation)) {
    case "x":
      return { line: wall.z, along: wall.x }
    case "z":
      return { line: wall.x, along: wall.z }
    case "rising":
      return { line: wall.x - wall.z, along: wall.x }
    case "falling":
      return { line: wall.x + wall.z, along: wall.x }
  }
}

/**
 * Merge wall segments into maximal straight runs of the same direction and
 * colour, so a run renders as ONE continuous mesh (no per-segment seams).
 */
export const buildRuns = (walls: SceneObject[], defaultColor: string): Run[] => {
  // Faces seen the run's way round (a segment may be built turned about).
  const facesOf = (wall: SceneObject) => {
    const [front, back] = getWallFacesFrom(wall, {
      rotation: EDGE_ROTATION[edgeDirection(wall.rotation)],
    })

    return [front ?? defaultColor, back ?? defaultColor] as const
  }
  const groups = new Map<string, SceneObject[]>()
  for (const wall of walls) {
    const [front, back] = facesOf(wall)
    const groupKey = `${edgeDirection(wall.rotation)}|${lineOf(wall).line}|${front}|${back}`
    const group = groups.get(groupKey)
    if (group) group.push(wall)
    else groups.set(groupKey, [wall])
  }

  const runs: Run[] = []
  for (const [groupKey, segments] of groups) {
    const direction = edgeDirection(segments[0].rotation)
    const [color, back] = facesOf(segments[0])
    const along = (wall: SceneObject) => lineOf(wall).along
    segments.sort((first, second) => along(first) - along(second))
    const unit = edgeLength({ type: "wall", rotation: segments[0].rotation })

    let start = 0
    for (let i = 1; i <= segments.length; i++) {
      // Consecutive segments are one grid step apart along the run.
      const contiguous = i < segments.length && along(segments[i]) - along(segments[i - 1]) === SEG
      if (!contiguous) {
        const first = segments[start]
        const last = segments[i - 1]
        runs.push({
          key: `${groupKey}|${along(first)}`,
          direction,
          rotation: EDGE_ROTATION[direction],
          color,
          back,
          x: (first.x + last.x) / 2,
          z: (first.z + last.z) / 2,
          length: (i - start) * unit,
          ids: segments.slice(start, i).map((wall) => wall.id),
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

  const walls = useMemo(() => objects.filter((object) => object.type === "wall"), [objects])
  const wallColor = useSurfaces().wall
  // The cursor cutaway slices these runs in their shader (see cutaway.ts):
  // they stay whole, however the cut moves.
  const runs = useMemo(() => buildRuns(walls, wallColor), [walls, wallColor])
  // Glass partitions merge the same way. They never trigger the cutaway —
  // you can see through them already.
  const glassRuns = useMemo(
    () =>
      buildRuns(
        objects.filter((object) => object.type === "glassWall"),
        getItem("glassWall").defaultColor
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
    for (const run of runs)
      for (const { color, geometry } of runGeometries(run))
        byColor.set(color, [...(byColor.get(color) ?? []), geometry])

    return [...byColor].map(([color, parts]) => {
      const geometry = mergeGeometries(parts, false)
      parts.forEach((part) => part.dispose())

      return { color, geometry }
    })
  }, [runs])
  useEffect(() => () => meshes.forEach((mesh) => mesh.geometry?.dispose()), [meshes])

  return (
    <CutawayContext.Provider value="mergedWall">
      {meshes.map(
        (mesh) =>
          mesh.geometry && (
            <mesh key={mesh.color} geometry={mesh.geometry} castShadow receiveShadow>
              <Surface color={mesh.color} roughness={0.85} isRecessed />
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
const runGeometries = (run: Run) => {
  const slabs =
    run.color === run.back
      ? [{ color: run.color, depth: WALL.depth, offset: 0 }]
      : [
          { color: run.color, depth: WALL.depth / 2, offset: WALL.depth / 4 },
          { color: run.back, depth: WALL.depth / 2, offset: -WALL.depth / 4 },
        ]
  const anchor = new Vector3(run.x, 0, run.z)

  return slabs.map(({ color, depth, offset }) => {
    // Sink the base slightly below the floor so there's no bright contact gap.
    const box = new BoxGeometry(run.length, WALL.height + WALL.sink, depth)
    box.translate(0, (WALL.height - WALL.sink) / 2, offset)
    box.rotateY(run.rotation)
    box.translate(anchor.x, 0, anchor.z)

    return { color, geometry: setCutAttributes(box, anchor, CUT_DIRECTION[run.direction]) }
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
    for (const run of runs) {
      // The run's place: turned to run its way, at its middle.
      place.makeRotationY(run.rotation).setPosition(run.x, 0, run.z)
      for (const part of getGlassRunParts(run.length)) {
        const box = new BoxGeometry(...part.args)
        box.translate(...part.position).applyMatrix4(place)
        if (part.isPane) panes.push(box)
        else frames.set(run.color, [...(frames.get(run.color) ?? []), box])
      }
    }
    const merge = (parts: BufferGeometry[]) => {
      const geometry = parts.length ? mergeGeometries(parts, false) : null
      parts.forEach((part) => part.dispose())

      return geometry
    }

    return {
      frames: [...frames].map(([color, parts]) => ({ color, geometry: merge(parts) })),
      panes: merge(panes),
    }
  }, [runs])
  useEffect(
    () => () => {
      meshes.frames.forEach((frame) => frame.geometry?.dispose())
      meshes.panes?.dispose()
    },
    [meshes]
  )

  return (
    <>
      {meshes.frames.map(
        (frame) =>
          frame.geometry && (
            <mesh key={frame.color} geometry={frame.geometry} castShadow receiveShadow>
              <GlassFrameSurface color={frame.color} />
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
