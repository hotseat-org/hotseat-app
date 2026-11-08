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
const MIN_ZOOM = 12
const MAX_ZOOM = 120
const DURATION = 0.45
/** Zoomed in: past this share of the whole office's fit. Out again below the second (no flicker). */
const ZOOMED_IN_ABOVE = 1.12
const ZOOMED_OUT_BELOW = 1.04

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
/** Room kept between the text column's content and the office (px). */
const COLUMN_GAP = 24

export const CameraFit = ({
  insets = NO_INSETS,
  shift = 0,
}: {
  insets?: FitInsets
  /** The picture's centre is moved right by this much (ViewShift): fit in what's left. */
  shift?: number
}) => {
  const nonce = useEditorStore((state) => state.fitNonce)
  // Also frame the office when it first gets content (e.g. a template picked
  // on an empty office) — on any floor: showing a floor with pieces after an
  // empty one isn't that (it zoomed in on that floor's structure).
  const hasObjects = useEditorStore(
    (state) => state.objects.length > 0 || state.otherFloorsPieces.length > 0
  )
  const store = useEditorStoreApi()
  const camera = useThree((state) => state.camera) as OrthographicCamera
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null
  const invalidate = useThree((state) => state.invalidate)
  const width = useThree((state) => state.size.width)
  const anim = useRef<Anim | null>(null)
  const latest = useRef({ insets, shift, width })
  latest.current = { insets, shift, width }
  const didInitial = useRef(false)
  // The centre's move the last frame was made for (see ViewShift).
  const framedShift = useRef(shift)
  // The whole office's fit zoom: closer than it is "zoomed in".
  const fitZoom = useRef(0)
  // The whole office's box, to tell whether it's under the text column.
  const officeBox = useRef<Box3 | null>(null)
  const corner = useRef(new Vector3())

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

    // A moved centre (a text column beside the office, or none — switching
    // modes) frames it afresh, at once: the mode's loading cover hides it, and
    // nothing drifts once you can work.
    const isNewRoom = framedShift.current !== shift
    framedShift.current = shift
    const instant = !didInitial.current || isNewRoom
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
    officeBox.current = box
    fitZoom.current = frame(box, instant) ?? fitZoom.current
  }, [nonce, controls, hasObjects, shift])

  // An area asked for (a module's — the way to a desk, from the entrance to the chair).
  const frameRequest = useEditorStore((state) => state.frameRequest)
  useEffect(() => {
    if (!controls || !frameRequest) return

    const { bounds } = frameRequest
    frame(
      new Box3(new Vector3(bounds.minX, 0, bounds.minZ), new Vector3(bounds.maxX, 1, bounds.maxZ)),
      false
    )
  }, [frameRequest?.nonce, controls])

  /** Move the view onto `box` (animated unless `instant`), keeping the angle; its zoom. */
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
    const { insets: pad, shift: centreShift, width: canvasWidth } = latest.current
    const covered = pad.left + pad.right + centreShift * 2
    const free = canvasWidth > 0 ? Math.max(0.3, (canvasWidth - covered) / canvasWidth) : 1
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

      return zoom
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

    return zoom
  }

  // Whether the camera is closer than the whole office's fit, for the app
  // (the office shell's headline folds away). Written only when it changes.
  useFrame(() => {
    if (!fitZoom.current) return

    const { isZoomedIn, setZoomedIn } = store.getState()
    const ratio = camera.zoom / fitZoom.current
    const isNowZoomedIn = isZoomedIn ? ratio >= ZOOMED_OUT_BELOW : ratio > ZOOMED_IN_ABOVE
    if (isNowZoomedIn !== isZoomedIn) setZoomedIn(isNowZoomedIn)
  })

  // Whether the office reaches under the text column on the left (its left
  // edge on screen within the column's room, `shift` × 2): a page there then
  // needs a surface behind its words. Eight corners projected per frame drawn;
  // written only when it changes.
  useFrame(() => {
    const box = officeBox.current
    if (!box || !shift) return

    let leftmost = Infinity
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const point = corner.current.set(x, y, z).project(camera)
          leftmost = Math.min(leftmost, ((point.x + 1) / 2) * width)
        }
    const { isOfficeUnderColumn, setOfficeUnderColumn } = store.getState()
    const isNowUnder = leftmost < shift * 2 - COLUMN_GAP
    if (isNowUnder !== isOfficeUnderColumn) setOfficeUnderColumn(isNowUnder)
  })

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
