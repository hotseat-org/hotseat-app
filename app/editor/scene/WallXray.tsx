import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { Box3, Vector3 } from "three"
import { useEditorStoreApi } from "../store"
import { GRID, isEdgeType, isWall, isWallMounted } from "../types"
import { WALL } from "../objects/dimensions"
import { edgeDirection, edgeLength, footprintCells } from "../layout"
import { getEdge } from "../catalog"
import { CUT_DIRECTION, cutAxes, cutawayUniform, MAX_CUTS } from "./cutaway"
import { intersectEdge } from "./wallHit"

/**
 * Speeds (1/s). Cutting away is quick so it keeps up with the cursor (~0.1s);
 * restoring is a touch softer (~0.15s) so it doesn't flicker back. Along one
 * wall the cut glides after the cursor rather than jumping segment to segment.
 */
const RATE_IN = 32
const RATE_OUT = 20
const RATE_GLIDE = 22

/** A little slack across the wall's thickness so grazing the top edge counts. */
const SLACK = 0.12
/** Wall items hang above this height (a pointer lower down is at the wall). */
const MOUNT_BOTTOM = 0.4

/** A wall line being cut (or easing back): see cutawayUniform. */
interface Cut {
  /** Which way the cut wall runs: a CUT_DIRECTION. */
  axis: number
  line: number
  centre: number
  targetCentre: number
  amount: number
  target: number
}
/** Where the cursor wants a cut: the line of the wall it points at, and where along it. */
type Aim = Pick<Cut, "axis" | "line" | "centre">

interface Props {
  enabled: boolean
  /** Editing: pointing at a door/window keeps it solid, to pick it up. */
  isEditing: boolean
}

/**
 * X-ray cutaway: every frame, finds the wall the cursor ray passes through and
 * cuts it down round that spot (plus a ramp either side), revealing — and
 * letting you click/place — what's behind. Walls carry no pointer handlers, so
 * clicks already pass through them; this is the visual. It only eases a few
 * numbers that the walls' shader reads (see cutaway.ts): nothing re-renders.
 */
export const WallXray = ({ enabled, isEditing }: Props) => {
  const { camera, raycaster, pointer, gl: renderer, invalidate } = useThree()
  const store = useEditorStoreApi()
  const box = useMemo(() => new Box3(), [])
  const min = useMemo(() => new Vector3(), [])
  const max = useMemo(() => new Vector3(), [])
  const hitPoint = useMemo(() => new Vector3(), [])
  const inside = useRef(false)
  const cuts = useRef<Cut[]>([])

  // Track whether the cursor is over the canvas (clear when it leaves), and
  // redraw on move so the cutaway follows under frameloop="demand".
  useEffect(() => {
    const element = renderer.domElement
    const move = () => {
      inside.current = true
      invalidate()
    }
    const leave = () => {
      inside.current = false
      invalidate()
    }
    element.addEventListener("pointermove", move)
    element.addEventListener("pointerleave", leave)

    return () => {
      element.removeEventListener("pointermove", move)
      element.removeEventListener("pointerleave", leave)
    }
  }, [renderer, invalidate])

  // Switching tools on/off: kick a frame so the cut eases out (or in).
  useEffect(() => invalidate(), [enabled, invalidate])
  // Unmounted (leaving the office): no cut left behind for the next scene.
  useEffect(() => () => cutawayUniform.value.forEach((vector) => vector.set(0, 0, 0, 0)), [])

  /** The wall lines the cursor ray passes through, nearest first (one per line). */
  const getAims = (): Aim[] => {
    if (!enabled || !inside.current) return []

    raycaster.setFromCamera(pointer, camera)
    const ray = raycaster.ray
    const objects = store.getState().objects

    // Pointing at a wall item (a TV, a picture…) keeps its wall up, so it can
    // be seen and picked — like pointing at a door.
    for (const object of objects) {
      if (!isWallMounted(object.type)) continue

      const [cellsX, cellsZ] = footprintCells(object.type, object.rotation)
      min.set(object.x - (cellsX * GRID) / 2, MOUNT_BOTTOM, object.z - (cellsZ * GRID) / 2)
      max.set(object.x + (cellsX * GRID) / 2, WALL.height, object.z + (cellsZ * GRID) / 2)
      if (ray.intersectsBox(box.set(min, max))) return []
    }

    // While editing only walls cut: pointing straight at a door/window keeps it
    // solid (so it can be picked up); it's still cut with a section round it.
    // Viewing, there's nothing to pick up: doors and windows cut too. Glass
    // partitions never do — you can see through them already.
    const hits: (Aim & { distance: number })[] = []
    for (const object of objects) {
      if (!isEdgeType(object.type) || getEdge(object.type)?.isSeeThrough) continue
      if (isEditing && !isWall(object.type)) continue
      if (!intersectEdge(ray, object, hitPoint, SLACK)) continue

      const half = edgeLength(object) / 2
      const axis = CUT_DIRECTION[edgeDirection(object.rotation)]
      const { along, across } = cutAxes(axis)
      const middle = object.x * along[0] + object.z * along[1]
      hits.push({
        axis,
        line: object.x * across[0] + object.z * across[1],
        // Where the ray meets the wall, clamped to this segment.
        centre: Math.min(
          middle + half,
          Math.max(middle - half, hitPoint.x * along[0] + hitPoint.z * along[1])
        ),
        distance: hitPoint.distanceTo(ray.origin),
      })
    }
    hits.sort((first, second) => first.distance - second.distance)
    const aims: Aim[] = []
    for (const hit of hits)
      if (!aims.some((existing) => existing.axis === hit.axis && existing.line === hit.line))
        aims.push(hit)

    return aims.slice(0, MAX_CUTS)
  }

  // Ease the cuts toward where the cursor points; write them to the shader.
  // It follows the cursor while the camera moves too: a ray test and a few
  // numbers per frame, nothing rebuilt.
  useFrame((_, delta) => {
    const aims = getAims()

    const list = cuts.current
    for (const cut of list) cut.target = 0
    for (const aim of aims) {
      const cut = list.find(
        (candidate) => candidate.axis === aim.axis && candidate.line === aim.line
      )
      if (cut) {
        cut.target = 1
        cut.targetCentre = aim.centre
        // Back from (nearly) nothing: start where it's wanted, don't glide there.
        if (cut.amount < 0.05) cut.centre = aim.centre
      } else list.push({ ...aim, targetCentre: aim.centre, amount: 0, target: 1 })
    }
    const blendIn = 1 - Math.exp(-delta * RATE_IN)
    const blendOut = 1 - Math.exp(-delta * RATE_OUT)
    const blendGlide = 1 - Math.exp(-delta * RATE_GLIDE)
    let isAnimating = false
    for (const cut of list) {
      cut.amount += (cut.target - cut.amount) * (cut.target > cut.amount ? blendIn : blendOut)
      cut.centre += (cut.targetCentre - cut.centre) * blendGlide
      if (Math.abs(cut.target - cut.amount) < 0.005) cut.amount = cut.target
      if (Math.abs(cut.targetCentre - cut.centre) < 0.002) cut.centre = cut.targetCentre
      if (cut.amount !== cut.target || cut.centre !== cut.targetCentre) isAnimating = true
    }
    // Gone once fully restored; the newest win if there are too many.
    cuts.current = list.filter((cut) => cut.target > 0 || cut.amount > 0).slice(-MAX_CUTS)
    cutawayUniform.value.forEach((vector, i) => {
      const cut = cuts.current[i]
      if (cut) vector.set(cut.axis, cut.line, cut.centre, cut.amount)
      else vector.set(0, 0, 0, 0)
    })
    if (isAnimating) invalidate() // keep easing under frameloop="demand"
  })

  return null
}
