import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { Plane, Vector3 } from "three"
import { useEditorStore, useEditorStoreApi } from "../store"
import {
  SEG,
  openingPlan,
  edgeBlocked,
  edgeKey,
  edgeNodes,
  nearestEdgeId,
  unitEdges,
  roomEdges,
  wallRun,
} from "../layout"
import {
  BUILD_HALF,
  isEdgeType,
  isOpening,
  isWall,
  type Cell,
  type SceneObject,
  type Tool,
} from "../types"
import { NodeMarker } from "./WallGhost"
import { GhostObject } from "./GhostObject"
import { GhostWalls } from "./GhostWalls"

const BUILD = "#3b82f6"
const ERASE = "#ef4444"
const GROUND = new Plane(new Vector3(0, 1, 0), 0)

/** Wall nodes stay on the buildable floor (same bounds as furniture). */
const clampNode = (value: number) =>
  Math.max(-BUILD_HALF, Math.min(BUILD_HALF, Math.round(value / SEG) * SEG))

const same = (first: Cell | null, second: Cell | null) =>
  (!first && !second) || (!!first && !!second && first.x === second.x && first.z === second.z)

const isBuildTool = (tool: Tool) =>
  tool === "room" || tool === "delete" || isWall(tool) || isOpening(tool)

/**
 * Drives the Wall, Glass wall, Door, Glass door, Window and Erase tools. Tracks the cursor against a math
 * ground plane (so dragging works even over tall walls) and draws translucent
 * previews of what will be added / removed, committing on release.
 */
export const BuildController = () => {
  const tool = useEditorStore((state) => state.tool)
  const objects = useEditorStore((state) => state.objects)
  const store = useEditorStoreApi()
  const active = isBuildTool(tool)

  const { camera, raycaster, pointer, gl: renderer } = useThree()

  const [hover, setHover] = useState<Cell | null>(null)
  const [start, setStart] = useState<Cell | null>(null)
  const [end, setEnd] = useState<Cell | null>(null)

  // Refs mirror state so the once-bound DOM handlers always read fresh values.
  const hoverRef = useRef<Cell | null>(null)
  const hoverRawRef = useRef<{ x: number; z: number } | null>(null)
  const startRef = useRef<Cell | null>(null)
  const endRef = useRef<Cell | null>(null)
  // The scene as it was on pointer-down (see the erase click in onUp).
  const downObjectsRef = useRef<SceneObject[] | null>(null)
  hoverRef.current = hover
  startRef.current = start
  endRef.current = end

  const hit = useMemo(() => new Vector3(), [])

  // Track the cursor on the ground plane every frame while a build tool is on.
  useFrame(() => {
    if (!active) return

    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(GROUND, hit)) return

    hoverRawRef.current = { x: hit.x, z: hit.z }
    const node: Cell = { x: clampNode(hit.x), z: clampNode(hit.z) }
    if (!same(node, hoverRef.current)) setHover(node)
    if (startRef.current && !same(node, endRef.current)) setEnd(node)
  })

  // Start / commit the drag from the canvas directly (bypasses occluders).
  useEffect(() => {
    if (!active) return

    const element = renderer.domElement

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !hoverRef.current) return

      downObjectsRef.current = store.getState().objects
      setStart(hoverRef.current)
      setEnd(hoverRef.current)
    }

    const onUp = (event: PointerEvent) => {
      if (event.button !== 0) return

      const startNode = startRef.current
      const endNode = endRef.current
      if (startNode && endNode) {
        const state = store.getState()
        const raw = hoverRawRef.current
        if (isWall(state.tool)) {
          state.addWalls(wallRun(startNode, endNode), state.tool)
        } else if (state.tool === "room") {
          state.addWalls(roomEdges(startNode, endNode))
        } else if (isOpening(state.tool)) {
          // Toggle the segment nearest the click: wall → opening, opening of
          // this kind → wall, the other kind → swapped (door ⇄ window).
          const id = raw && nearestEdgeId(state.objects, raw.x, raw.z)
          if (id) state.toggleOpening(id, state.tool, raw.x, raw.z)
        } else if (same(startNode, endNode)) {
          // A click (no drag): remove the single segment under the cursor —
          // unless that click already erased a piece of furniture (handled by
          // ObjectRenderer; R3F's stopPropagation doesn't reach this DOM
          // listener), which would otherwise take a nearby wall with it.
          const erasedFurniture = downObjectsRef.current !== state.objects
          const id = !erasedFurniture && raw && nearestEdgeId(state.objects, raw.x, raw.z)
          if (id) state.removeObject(id)
        } else {
          state.removeEdges(wallRun(startNode, endNode))
        }
      }

      setStart(null)
      setEnd(null)
    }

    element.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)

    return () => {
      element.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
    }
  }, [active, renderer, store])

  // Reset any in-progress drag when switching tools.
  useEffect(() => {
    setStart(null)
    setEnd(null)
  }, [tool])

  if (!active) return null

  const run = start && end ? (tool === "room" ? roomEdges(start, end) : wallRun(start, end)) : null

  if (isWall(tool) || tool === "room") {
    return (
      <>
        {run ? (
          <GhostWalls
            edges={run.map((edge) => ({
              ...edge,
              type: isWall(tool) ? tool : "wall",
              // Red where the run would cut through furniture (skipped on commit).
              tint: edgeBlocked(objects, edge) ? ERASE : undefined,
            }))}
          />
        ) : (
          hover && <NodeMarker x={hover.x} z={hover.z} color={BUILD} />
        )}
        {start && <NodeMarker x={start.x} z={start.z} color={BUILD} />}
        {end && <NodeMarker x={end.x} z={end.z} color={BUILD} />}
      </>
    )
  }

  if (isOpening(tool)) {
    // Preview what a click does on the segment under the cursor: cut an
    // opening (two wall halves → door/window), swap door ⇄ window, or fill an
    // opening of this kind back to walls.
    const raw = hoverRawRef.current
    const id = raw ? nearestEdgeId(objects, raw.x, raw.z) : null
    const segment = id ? objects.find((object) => object.id === id) : null
    if (!segment) return null

    const plan = openingPlan(objects, segment.id, tool, raw?.x, raw?.z)
    if (!plan) {
      // A lone half-segment with no wall neighbour can't hold an opening.
      return (
        <GhostObject
          type={segment.type}
          x={segment.x}
          z={segment.z}
          rotation={segment.rotation}
          tint={ERASE}
          scale={1.06}
        />
      )
    }

    const reverting = segment.type === tool
    const target = reverting ? segment : plan.add[0]
    const [startNode, endNode] = edgeNodes({ ...target, id: "" })
    const color = reverting ? ERASE : BUILD

    return (
      <>
        {reverting ? (
          // This opening reverts to walls — highlight its two halves.
          <GhostWalls
            edges={plan.add.map((edge) => ({
              ...edge,
              type: isWall(edge.type) ? edge.type : "wall",
              tint: ERASE,
            }))}
            grow={0.03}
          />
        ) : (
          // The new door/window appears here — show it translucent in place.
          <GhostObject type={tool} x={target.x} z={target.z} rotation={target.rotation} />
        )}
        <NodeMarker x={startNode.x} z={startNode.z} color={color} />
        <NodeMarker x={endNode.x} z={endNode.z} color={color} />
      </>
    )
  }

  // Erase preview: highlight the actual wall/door segments that will be removed.
  let doomed: typeof objects = []
  if (run && start && end && !same(start, end)) {
    const kill = new Set(run.map(edgeKey))
    doomed = objects.filter(
      (object) =>
        isEdgeType(object.type) && unitEdges(object).some((edge) => kill.has(edgeKey(edge)))
    )
  } else if (hoverRawRef.current) {
    const id = nearestEdgeId(objects, hoverRawRef.current.x, hoverRawRef.current.z)
    if (id) doomed = objects.filter((object) => object.id === id)
  }

  // Walls as merged runs; doors and windows as themselves.
  return (
    <>
      <GhostWalls
        edges={doomed.flatMap((object) =>
          isWall(object.type) ? [{ ...object, type: object.type, tint: ERASE }] : []
        )}
        grow={0.04}
      />
      {doomed
        .filter((object) => isOpening(object.type))
        .map((object) => (
          <GhostObject
            key={object.id}
            type={object.type}
            x={object.x}
            z={object.z}
            rotation={object.rotation}
            tint={ERASE}
            scale={1.06}
          />
        ))}
    </>
  )
}
