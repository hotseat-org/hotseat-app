import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import { Box3, MathUtils, Vector3, type OrthographicCamera } from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useEditorStore, useEditorStoreApi } from "../store"
import { edgeNodes, footprintCells } from "../layout"
import { GRID, isEdgeType, isMarker } from "../types"
import { WALL } from "../objects/dimensions"
import { isTypingTarget } from "../shell/keyboard"

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
  from: { target: Vector3; position: Vector3; zoom: number }
  to: { target: Vector3; position: Vector3; zoom: number }
}

/**
 * "Fit to office": frames the whole layout — re-centres the orbit target on
 * it and zooms so it fills the view, keeping the current viewing angle. Runs
 * instantly when the office opens, and animated on `requestFit()` (button / F).
 * Showing the way to a desk frames that route instead (see wayfinding.ts).
 */
export const CameraFit = ({ insets = NO_INSETS }: { insets?: FitInsets }) => {
  const nonce = useEditorStore((state) => state.fitNonce)
  // Also frame the office when it first gets content (e.g. a template picked
  // on an empty office).
  const hasObjects = useEditorStore((state) => state.objects.length > 0)
  const store = useEditorStoreApi()
  const camera = useThree((state) => state.camera) as OrthographicCamera
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const invalidate = useThree((state) => state.invalidate)
  const width = useThree((state) => state.size.width)
  const anim = useRef<Anim | null>(null)
  const latest = useRef({ insets, width })
  latest.current = { insets, width }
  const didInitial = useRef(false)

  // F frames the office, in both modes.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

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
    for (const object of objects) {
      if (isMarker(object.type)) continue

      let halfX: number
      let halfZ: number
      if (isEdgeType(object.type)) {
        // Its two ends (any direction, diagonals too), and the wall's thickness.
        for (const node of edgeNodes(object)) {
          box.expandByPoint(new Vector3(node.x - WALL.depth / 2, 0, node.z - WALL.depth / 2))
          box.expandByPoint(
            new Vector3(node.x + WALL.depth / 2, WALL.height, node.z + WALL.depth / 2)
          )
        }
        continue
      } else {
        const [cellsX, cellsZ] = footprintCells(object.type, object.rotation)
        ;[halfX, halfZ] = [(cellsX * GRID) / 2, (cellsZ * GRID) / 2]
      }

      box.expandByPoint(new Vector3(object.x - halfX, 0, object.z - halfZ))
      box.expandByPoint(new Vector3(object.x + halfX, WALL.height, object.z + halfZ))
    }
    frame(box, instant)
  }, [nonce, controls, hasObjects])

  // An area asked for (a module's — the way to a desk, from the entrance to the chair).
  const frameRequest = useEditorStore((state) => state.frameRequest)
  useEffect(() => {
    if (!controls || !frameRequest) return

    const { bounds } = frameRequest
    frame(
      new Box3(new Vector3(bounds.x0, 0, bounds.z0), new Vector3(bounds.x1, 1, bounds.z1)),
      false
    )
  }, [frameRequest?.nonce, controls])

  /** Move the view onto `box` (animated unless `instant`), keeping the angle. */
  function frame(box: Box3, instant: boolean) {
    if (!controls) return

    const center = box.getCenter(new Vector3()).setY(0)

    // Keep the viewing angle: move camera + target together onto the centre.
    const offset = camera.position.clone().sub(controls.target)
    const position = center.clone().add(offset)

    // Zoom that fits the box's projected corners (NDC scales linearly with
    // an orthographic camera's zoom, so measure at zoom 1 and divide).
    const probe = camera.clone()
    probe.position.copy(position)
    probe.lookAt(center)
    probe.zoom = 1
    probe.updateMatrixWorld()
    probe.updateProjectionMatrix()
    let extentX = 0
    let extentY = 0
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const point = new Vector3(x, y, z).project(probe)
          extentX = Math.max(extentX, Math.abs(point.x))
          extentY = Math.max(extentY, Math.abs(point.y))
        }
    // Beside the floating panels: the office fits the free width, centred in it.
    const { insets: pad, width: canvasWidth } = latest.current
    const free =
      canvasWidth > 0 ? Math.max(0.3, (canvasWidth - pad.left - pad.right) / canvasWidth) : 1
    const extent = Math.max(extentX / free, extentY, 1e-6)
    const zoom = MathUtils.clamp(FILL / extent, MIN_ZOOM, MAX_ZOOM)
    // The free area's centre, in NDC — moved there by sliding the camera sideways.
    const shiftNdc = canvasWidth > 0 ? (pad.left - pad.right) / canvasWidth : 0
    const right = new Vector3().setFromMatrixColumn(probe.matrixWorld, 0)
    const slide = right.multiplyScalar((-shiftNdc * (camera.right - camera.left)) / 2 / zoom)
    const to = { target: center.clone().add(slide), position: position.clone().add(slide), zoom }
    if (instant) {
      apply(to, camera, controls)
      invalidate()

      return
    }

    anim.current = {
      t: 0,
      from: {
        target: controls.target.clone(),
        position: camera.position.clone(),
        zoom: camera.zoom,
      },
      to,
    }
    invalidate()
  }

  useFrame((_, delta) => {
    const animation = anim.current
    if (!animation || !controls) return

    animation.t = Math.min(1, animation.t + delta / DURATION)
    const eased = 1 - Math.pow(1 - animation.t, 3) // ease-out
    apply(
      {
        target: animation.from.target.clone().lerp(animation.to.target, eased),
        position: animation.from.position.clone().lerp(animation.to.position, eased),
        zoom: MathUtils.lerp(animation.from.zoom, animation.to.zoom, eased),
      },
      camera,
      controls
    )
    if (animation.t >= 1) anim.current = null

    invalidate()
  })

  return null
}

const apply = (
  pose: { target: Vector3; position: Vector3; zoom: number },
  camera: OrthographicCamera,
  controls: OrbitControlsImpl
) => {
  controls.target.copy(pose.target)
  camera.position.copy(pose.position)
  camera.zoom = pose.zoom
  camera.updateProjectionMatrix()
  controls.update()
}
