import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import { Box3, Vector3, type OrthographicCamera } from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useEditorStore, useEditorStoreApi } from "../store"
import { edgeNodes, footprintCells } from "../layout"
import { GRID, isEdgeType, isMarker } from "../types"
import { WALL } from "../objects/dimensions"
import { isTypingTarget } from "../keyboard"
import { routeBounds, useRoute } from "../wayfinding"

/** Share of the viewport the office fills (room for the floating panels). */
const FILL = 0.78
/** Must match the OrbitControls zoom limits in Scene. */
const MIN_ZOOM = 20
const MAX_ZOOM = 120
const DURATION = 0.45

/** Screen space (px) covered by floating panels on each side. */
export interface FitInsets {
  left: number
  right: number
}

const NO_INSETS: FitInsets = { left: 0, right: 0 }

interface Anim {
  t: number
  from: { target: Vector3; pos: Vector3; zoom: number }
  to: { target: Vector3; pos: Vector3; zoom: number }
}

/**
 * "Fit to office": frames the whole layout — re-centres the orbit target on
 * it and zooms so it fills the view, keeping the current viewing angle. Runs
 * instantly when the office opens, and animated on `requestFit()` (button / F).
 * Showing the way to a desk frames that route instead (see wayfinding.ts).
 */
export const CameraFit = ({ insets = NO_INSETS }: { insets?: FitInsets }) => {
  const nonce = useEditorStore((s) => s.fitNonce)
  // Also frame the office when it first gets content (e.g. a template picked
  // on an empty office).
  const hasObjects = useEditorStore((s) => s.objects.length > 0)
  const store = useEditorStoreApi()
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const anim = useRef<Anim | null>(null)
  const latest = useRef({ insets, width })
  latest.current = { insets, width }
  const didInitial = useRef(false)

  // F frames the office, in both modes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      store.getState().requestFit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [store])

  useEffect(() => {
    if (!controls) return
    const objects = store.getState().objects
    if (objects.length === 0) return
    const instant = !didInitial.current
    didInitial.current = true

    // Bounding box of everything placed (footprints; walls/openings by length).
    const box = new Box3()
    for (const o of objects) {
      if (isMarker(o.type)) continue
      let hx: number
      let hz: number
      if (isEdgeType(o.type)) {
        // Its two ends (any direction, diagonals too), and the wall's thickness.
        for (const n of edgeNodes(o)) {
          box.expandByPoint(new Vector3(n.x - WALL.depth / 2, 0, n.z - WALL.depth / 2))
          box.expandByPoint(new Vector3(n.x + WALL.depth / 2, WALL.height, n.z + WALL.depth / 2))
        }
        continue
      } else {
        const [cx, cz] = footprintCells(o.type, o.rotation)
        ;[hx, hz] = [(cx * GRID) / 2, (cz * GRID) / 2]
      }
      box.expandByPoint(new Vector3(o.x - hx, 0, o.z - hz))
      box.expandByPoint(new Vector3(o.x + hx, WALL.height, o.z + hz))
    }
    frame(box, instant)
  }, [nonce, controls, hasObjects])

  // The way to a desk: frame the route, from the entrance to the chair.
  const route = useRoute()
  const routeNonce = route?.path ? route.nonce : null
  useEffect(() => {
    if (!controls || !route?.path) return
    const b = routeBounds(route.path.points)
    frame(new Box3(new Vector3(b.x0, 0, b.z0), new Vector3(b.x1, 1, b.z1)), false)
  }, [routeNonce, controls])

  /** Move the view onto `box` (animated unless `instant`), keeping the angle. */
  function frame(box: Box3, instant: boolean) {
    if (!controls) return
    const center = box.getCenter(new Vector3()).setY(0)

    // Keep the viewing angle: move camera + target together onto the centre.
    const offset = camera.position.clone().sub(controls.target)
    const pos = center.clone().add(offset)

    // Zoom that fits the box's projected corners (NDC scales linearly with
    // an orthographic camera's zoom, so measure at zoom 1 and divide).
    const probe = camera.clone()
    probe.position.copy(pos)
    probe.lookAt(center)
    probe.zoom = 1
    probe.updateMatrixWorld()
    probe.updateProjectionMatrix()
    let extentX = 0
    let extentY = 0
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const p = new Vector3(x, y, z).project(probe)
          extentX = Math.max(extentX, Math.abs(p.x))
          extentY = Math.max(extentY, Math.abs(p.y))
        }
    // Beside the floating panels: the office fits the free width, centred in it.
    const { insets: pad, width: w } = latest.current
    const free = w > 0 ? Math.max(0.3, (w - pad.left - pad.right) / w) : 1
    const extent = Math.max(extentX / free, extentY, 1e-6)
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, FILL / extent))
    // The free area's centre, in NDC — moved there by sliding the camera sideways.
    const shiftNdc = w > 0 ? (pad.left - pad.right) / w : 0
    const right = new Vector3().setFromMatrixColumn(probe.matrixWorld, 0)
    const slide = right.multiplyScalar((-shiftNdc * (camera.right - camera.left)) / 2 / zoom)
    const to = { target: center.clone().add(slide), pos: pos.clone().add(slide), zoom }
    if (instant) {
      apply(to, camera, controls)
      invalidate()
      return
    }
    anim.current = {
      t: 0,
      from: { target: controls.target.clone(), pos: camera.position.clone(), zoom: camera.zoom },
      to,
    }
    invalidate()
  }

  useFrame((_, dt) => {
    const a = anim.current
    if (!a || !controls) return
    a.t = Math.min(1, a.t + dt / DURATION)
    const k = 1 - Math.pow(1 - a.t, 3) // ease-out
    apply(
      {
        target: a.from.target.clone().lerp(a.to.target, k),
        pos: a.from.pos.clone().lerp(a.to.pos, k),
        zoom: a.from.zoom + (a.to.zoom - a.from.zoom) * k,
      },
      camera,
      controls
    )
    if (a.t >= 1) anim.current = null
    invalidate()
  })

  return null
}

const apply = (
  v: { target: Vector3; pos: Vector3; zoom: number },
  camera: OrthographicCamera,
  controls: OrbitControlsImpl
) => {
  controls.target.copy(v.target)
  camera.position.copy(v.pos)
  camera.zoom = v.zoom
  camera.updateProjectionMatrix()
  controls.update()
}
