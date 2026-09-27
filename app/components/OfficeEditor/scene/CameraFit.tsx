import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import { Box3, Vector3, type OrthographicCamera } from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useEditorStore, useEditorStoreApi } from "../store"
import { edgeLength, footprintCells, runsAlongX } from "../layout"
import { GRID, isEdgeType, isMarker } from "../types"
import { WALL } from "../objects/dimensions"
import { isTypingTarget } from "../keyboard"

/** Share of the viewport the office fills (room for the floating panels). */
const FILL = 0.78
/** Must match the OrbitControls zoom limits in Scene. */
const MIN_ZOOM = 20
const MAX_ZOOM = 120
const DURATION = 0.45

interface Anim {
  t: number
  from: { target: Vector3; pos: Vector3; zoom: number }
  to: { target: Vector3; pos: Vector3; zoom: number }
}

/**
 * "Fit to office": frames the whole layout — re-centres the orbit target on
 * it and zooms so it fills the view, keeping the current viewing angle. Runs
 * instantly when the office opens, and animated on `requestFit()` (button / F).
 */
export const CameraFit = () => {
  const nonce = useEditorStore((s) => s.fitNonce)
  // Also frame the office when it first gets content (e.g. a template picked
  // on an empty office).
  const hasObjects = useEditorStore((s) => s.objects.length > 0)
  const store = useEditorStoreApi()
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const invalidate = useThree((s) => s.invalidate)
  const anim = useRef<Anim | null>(null)
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
        const along = edgeLength(o) / 2
        const across = WALL.depth / 2
        ;[hx, hz] = runsAlongX(o.rotation) ? [along, across] : [across, along]
      } else {
        const [cx, cz] = footprintCells(o.type, o.rotation)
        ;[hx, hz] = [(cx * GRID) / 2, (cz * GRID) / 2]
      }
      box.expandByPoint(new Vector3(o.x - hx, 0, o.z - hz))
      box.expandByPoint(new Vector3(o.x + hx, WALL.height, o.z + hz))
    }
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
    let extent = 0
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const p = new Vector3(x, y, z).project(probe)
          extent = Math.max(extent, Math.abs(p.x), Math.abs(p.y))
        }
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, FILL / Math.max(extent, 1e-6)))

    const to = { target: center, pos, zoom }
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
  }, [nonce, controls, hasObjects])

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
