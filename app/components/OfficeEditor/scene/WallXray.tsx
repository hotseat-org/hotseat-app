import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { Box3, Matrix4, Vector3 } from "three"
import { useEditorStoreApi } from "../store"
import { GRID, isEdgeType, isWallMounted } from "../types"
import { WALL } from "../objects/dimensions"
import { edgeLength, footprintCells } from "../layout"

const runsAlongX = (rotation: number) =>
  Math.abs(((rotation % Math.PI) + Math.PI) % Math.PI) < Math.PI / 4

/**
 * The cut-away section around the pointed-at segment (world units, centre to
 * centre along the wall): fully cut within FULL, then easing back up to full
 * height by REACH — a ramp, not a hard-edged notch.
 */
const FULL = 0.75
const REACH = 3.25
/** Cut depth (0…1) for a segment `d` units along the wall from the cursor's. */
const depthAt = (d: number) => {
  if (d <= FULL) return 1
  const s = Math.min(1, (d - FULL) / (REACH - FULL))
  return 1 - s * s * (3 - 2 * s) // smoothstep down to 0
}
/**
 * Fade speeds (1/s). Cutting away is quick so it keeps up with the cursor
 * (~0.1s); restoring is a touch softer (~0.15s) so it doesn't flicker back.
 */
const RATE_IN = 32
const RATE_OUT = 20

/** A little slack across the wall's thickness so grazing the top edge counts. */
const SLACK = 0.12
/** Wall items hang above this height (a pointer lower down is at the wall). */
const MOUNT_BOTTOM = 0.4
/**
 * After the camera stops (ms), the cutaway follows the cursor again. While it
 * moves the cut holds still: the cursor sweeping across walls would otherwise
 * split and re-merge wall runs every few frames (geometry rebuilds, a stutter —
 * badly so in Firefox).
 */
const CAMERA_SETTLE = 150

interface Props {
  enabled: boolean
  /** Per-segment fade (0…1), written here every frame and read by the renderers. */
  fades: Map<string, number>
  /** Called with the ids of segments that are fading/faded (only on change). */
  onChange: (ids: Set<string>) => void
}

/**
 * X-ray cutaway: every frame, finds the wall/door segments the cursor ray passes
 * through (plus a short section either side) so they can be cut down,
 * revealing — and letting you click/place — what's behind. Walls carry no
 * pointer handlers, so clicks already pass through them; this is the visual.
 * Holds still while the camera moves (see CAMERA_SETTLE).
 */
export const WallXray = ({ enabled, fades, onChange }: Props) => {
  const { camera, raycaster, pointer, gl, invalidate } = useThree()
  const store = useEditorStoreApi()
  const box = useMemo(() => new Box3(), [])
  const min = useMemo(() => new Vector3(), [])
  const max = useMemo(() => new Vector3(), [])
  const lastKey = useRef("")
  const inside = useRef(false)
  const lastView = useRef({ matrix: new Matrix4(), zoom: 0, movedAt: -Infinity })
  const held = useRef<Map<string, number>>(new Map())
  const settleTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  // Track whether the cursor is over the canvas (clear when it leaves), and
  // redraw on move so the cutaway follows under frameloop="demand".
  useEffect(() => {
    const el = gl.domElement
    const move = () => {
      inside.current = true
      invalidate()
    }
    const leave = () => {
      inside.current = false
      invalidate()
    }
    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
    }
  }, [gl, invalidate])

  // The cutaway slices walls with per-material clipping planes.
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  // Switching tools on/off: kick a frame so the section eases out (or in).
  useEffect(() => invalidate(), [enabled, invalidate])

  const emit = () => {
    const ids = [...fades.keys()].sort()
    const key = ids.join(",")
    if (key === lastKey.current) return
    lastKey.current = key
    onChange(new Set(ids))
  }

  /**
   * How deep each segment should be cut: the segments the cursor ray passes
   * through, widened to a section that ramps back up towards its ends.
   */
  const targets = (): Map<string, number> => {
    if (!enabled || !inside.current) return new Map()
    raycaster.setFromCamera(pointer, camera)
    const ray = raycaster.ray
    const objects = store.getState().objects
    const segments = objects.filter((o) => isEdgeType(o.type))

    // Pointing at a wall item (a TV, a picture…) keeps its wall up, so it can
    // be seen and picked — like pointing at a door.
    for (const o of objects) {
      if (!isWallMounted(o.type)) continue
      const [cx, cz] = footprintCells(o.type, o.rotation)
      min.set(o.x - (cx * GRID) / 2, MOUNT_BOTTOM, o.z - (cz * GRID) / 2)
      max.set(o.x + (cx * GRID) / 2, WALL.height, o.z + (cz * GRID) / 2)
      if (ray.intersectsBox(box.set(min, max))) return new Map()
    }

    // Only walls trigger the cutaway: pointing straight at a door/window keeps
    // it solid (so it can be picked up); it still fades with a hovered section.
    const hit = segments.filter((o) => {
      if (o.type !== "wall") return false
      const alongX = runsAlongX(o.rotation)
      const half = edgeLength(o) / 2
      const hx = alongX ? half : WALL.depth / 2 + SLACK
      const hz = alongX ? WALL.depth / 2 + SLACK : half
      min.set(o.x - hx, -WALL.sink, o.z - hz)
      max.set(o.x + hx, WALL.height + SLACK, o.z + hz)
      return ray.intersectsBox(box.set(min, max))
    })
    if (hit.length === 0) return new Map()

    const want = new Map<string, number>()
    for (const o of segments) {
      let depth = 0
      for (const h of hit) {
        const d = runsAlongX(h.rotation)
          ? runsAlongX(o.rotation) && o.z === h.z
            ? Math.abs(o.x - h.x)
            : Infinity
          : !runsAlongX(o.rotation) && o.x === h.x
            ? Math.abs(o.z - h.z)
            : Infinity
        depth = Math.max(depth, depthAt(d))
      }
      if (depth > 0.02) want.set(o.id, depth)
    }
    return want
  }

  // Ease each segment's fade toward its target depth (0 once out of the
  // section); fully-solid segments drop out so they rejoin their merged wall run.
  useFrame((_, dt) => {
    const now = performance.now()
    const view = lastView.current
    if (!view.matrix.equals(camera.matrixWorld) || view.zoom !== camera.zoom) {
      view.matrix.copy(camera.matrixWorld)
      view.zoom = camera.zoom
      view.movedAt = now
      // Re-aim once the camera has settled (frameloop="demand" won't on its own).
      window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(invalidate, CAMERA_SETTLE)
    }
    const isCameraMoving = now - view.movedAt < CAMERA_SETTLE
    const want = isCameraMoving ? held.current : targets()
    held.current = want
    const kIn = 1 - Math.exp(-dt * RATE_IN)
    const kOut = 1 - Math.exp(-dt * RATE_OUT)
    const existing = new Set(store.getState().objects.map((o) => o.id))
    let animating = false
    for (const id of new Set([...fades.keys(), ...want.keys()])) {
      const target = want.get(id) ?? 0
      const cur = fades.get(id) ?? 0
      const f = cur + (target - cur) * (target > cur ? kIn : kOut)
      if (!existing.has(id) || (target === 0 && f < 0.01)) {
        fades.delete(id)
        continue
      }
      fades.set(id, Math.abs(target - f) < 0.005 ? target : f)
      if (Math.abs(target - f) > 0.01) animating = true
    }
    emit()
    if (animating) invalidate() // keep easing under frameloop="demand"
  })

  return null
}
