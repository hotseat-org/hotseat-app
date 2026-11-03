import clsx from "clsx"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  Box3,
  Sphere,
  Vector3,
  type Camera,
  type Group,
  type PerspectiveCamera as PerspectiveCameraImpl,
  type Scene,
  type WebGLRenderer,
} from "three"
import { ObjectMesh } from "../../objects/ObjectMesh"
import { getRenderer } from "../../catalog/rendering"
import type { CatalogItem, ObjectType } from "../../types"
import { Wall } from "../../objects/Wall"
import { createRenderer } from "../../scene/createRenderer"
import {
  addThumbnail,
  PREVIEW_SIZE,
  requestThumbnail,
  useNextThumbnailRequest,
  useThumbnail,
} from "./thumbnails"

/** An item's own thumbnail model if it has one (see ItemRenderer.Thumbnail), else its mesh. */
const Thumbnail = ({ type, color }: { type: ObjectType; color?: string }) => {
  const { Thumbnail: Own } = getRenderer(type)

  return Own ? <Own color={color} /> : <ObjectMesh type={type} color={color} />
}

const CAMERA = { fov: 32, position: [3.4, 2.6, 3.4] as [number, number, number] }

/**
 * Slow turntable so previews read as 3D (Sims-style) — only while `spinning`
 * (hovered / armed). The tile canvases render on demand, so an idle catalog
 * costs nothing per frame.
 */
const Spin = ({ spinning, children }: { spinning: boolean; children: React.ReactNode }) => {
  const groupRef = useRef<Group>(null)
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    if (spinning) invalidate() // kick the demand loop
  }, [spinning, invalidate])
  useFrame((state, delta) => {
    if (!spinning || !groupRef.current) return

    groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.55
    state.invalidate()
  })

  return <group ref={groupRef}>{children}</group>
}

/** Viewing direction (from the object towards the camera) — a 3/4 hero angle. */
const VIEW_DIR = new Vector3(3.4, 2.6, 3.4).normalize()
/** Breathing room around the object's bounding sphere. */
const MARGIN = 1.08

/**
 * Frames its children instantly, BEFORE the first frame is drawn (layout effect
 * runs after the children mount, ahead of R3F's render loop). Unlike drei
 * <Bounds>, there's no fit animation — the model never "zooms in" on appear.
 * Fits the bounding SPHERE, which doesn't change as the turntable spins, so the
 * framing stays steady at every angle.
 */
const FitCamera = ({ children }: { children: React.ReactNode }) => {
  const groupRef = useRef<Group>(null)
  const camera = useThree((state) => state.camera) as PerspectiveCameraImpl
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    if (!groupRef.current) return

    const sphere = new Box3().setFromObject(groupRef.current).getBoundingSphere(new Sphere())
    const verticalFieldOfView = (camera.fov * Math.PI) / 180
    const horizontalFieldOfView =
      2 * Math.atan(Math.tan(verticalFieldOfView / 2) * (size.width / Math.max(1, size.height)))
    const distance =
      (sphere.radius * MARGIN) / Math.sin(Math.min(verticalFieldOfView, horizontalFieldOfView) / 2)
    camera.position.copy(sphere.center).addScaledVector(VIEW_DIR, distance)
    camera.near = Math.max(0.01, distance - sphere.radius * 2)
    camera.far = distance + sphere.radius * 2
    camera.lookAt(sphere.center)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  return <group ref={groupRef}>{children}</group>
}

/** Room tool thumbnail: a small square of walls (one segment = 0.5). */
const RoomPreview = ({ color }: { color?: string }) => {
  const offsets = [-0.5, 0, 0.5]

  return (
    <group>
      {offsets.flatMap((offset) => [
        <group key={`n${offset}`} position={[offset, 0, -0.75]}>
          <Wall color={color} />
        </group>,
        <group key={`s${offset}`} position={[offset, 0, 0.75]}>
          <Wall color={color} />
        </group>,
        <group key={`w${offset}`} position={[-0.75, 0, offset]} rotation={[0, Math.PI / 2, 0]}>
          <Wall color={color} />
        </group>,
        <group key={`e${offset}`} position={[0.75, 0, offset]} rotation={[0, Math.PI / 2, 0]}>
          <Wall color={color} />
        </group>,
      ])}
    </group>
  )
}

type ReadyHandler = (gl: WebGLRenderer, scene: Scene, camera: Camera) => void

/** Calls back once its Suspense boundary has resolved and the camera is framed. */
const OnReady = ({ onReady }: { onReady: ReadyHandler }) => {
  const { gl: renderer, scene, camera } = useThree()
  useLayoutEffect(() => onReady(renderer, scene, camera), [onReady, renderer, scene, camera])

  return null
}

/** Calls back on the first frame drawn with the item in it (once). */
const OnFirstFrame = ({ onFirstFrame }: { onFirstFrame: () => void }) => {
  const hasFired = useRef(false)
  useFrame(() => {
    if (hasFired.current) return

    hasFired.current = true
    onFirstFrame()
  })

  return null
}

const Contents = ({
  type,
  color,
  spinning,
  onReady,
  onFirstFrame,
}: {
  type: CatalogItem
  color?: string
  spinning: boolean
  /** Fired once the item (models included) is mounted and framed. */
  onReady?: ReadyHandler
  /** Fired as the first frame with the item in it is drawn. */
  onFirstFrame?: () => void
}) => (
  <>
    <ambientLight intensity={0.85} />
    <hemisphereLight intensity={0.5} groundColor="#a99a80" color="#fff6e8" />
    <directionalLight position={[4, 6, 3]} intensity={1.5} />
    <directionalLight position={[-3, 2, -4]} intensity={0.5} color="#bcd2ff" />
    <Suspense fallback={null}>
      {/* Framed instantly (no zoom-in animation) around the resting pose. */}
      <FitCamera>
        <Spin spinning={spinning}>
          {type === "room" ? (
            <RoomPreview color={color} />
          ) : (
            <Thumbnail type={type} color={color} />
          )}
        </Spin>
      </FitCamera>
      {/* After FitCamera: its layout effect (the framing) has run by then. */}
      {onReady && <OnReady onReady={onReady} />}
      {onFirstFrame && <OnFirstFrame onFirstFrame={onFirstFrame} />}
    </Suspense>
  </>
)

/** Previews draw on a transparent canvas (the tile shows through). */
const createPreviewRenderer = createRenderer({ alpha: true })

/**
 * Previews take no pointer events: nothing in them is clicked. (R3F would
 * attach them to the canvas's box once its renderer has started — and a
 * tile's live preview, gone as the pointer left it, has no box by then.)
 */
const noEvents = () => ({ enabled: false, priority: 0 })

/** Runs `callback` in idle time — or after `timeout` (ms) if there's none. */
const whenIdle = (callback: () => void, timeout = 50) => {
  if (typeof window.requestIdleCallback === "function")
    window.requestIdleCallback(callback, { timeout })
  else window.setTimeout(callback, Math.min(timeout, 16))
}
/** How long the background pre-render waits for idle time at most (ms): past the office loading. */
const BACKGROUND_WAIT = 2000

/**
 * Renders catalog stills, one at a time, in a single hidden canvas — one WebGL
 * context whose shaders compile once, instead of a context per tile. Each still
 * is taken as soon as its item is framed (models loaded). A tile on screen gets
 * its still right away; the background pre-render moves on in idle time, so it
 * never competes with the editor.
 */
export const ThumbnailStudio = () => {
  const next = useNextThumbnailRequest()
  // The background pre-render only starts an item in idle time (building its
  // model is work too); a tile waiting for its still starts at once.
  const [idleKey, setIdleKey] = useState<string | null>(null)
  useEffect(() => {
    if (!next || next.isUrgent) return

    let isCancelled = false
    whenIdle(() => {
      if (!isCancelled) setIdleKey(next.key)
    }, BACKGROUND_WAIT)

    return () => {
      isCancelled = true
    }
  }, [next])
  const request = next && (next.isUrgent || next.key === idleKey) ? next : undefined
  const key = request?.key
  const shownKey = useRef(key)
  shownKey.current = key
  const handleReady = useRef<ReadyHandler>(() => {})
  const isUrgent = request?.isUrgent ?? false
  handleReady.current = (renderer, scene, camera) => {
    if (!key) return

    // Its shaders compiled first, off the page's thread where the browser
    // can: drawn at once, the first stills compiled them in one long stall.
    void renderer
      .compileAsync(scene, camera)
      .catch(() => {}) // compiled as it's drawn instead
      .then(() => {
        if (shownKey.current !== key) return // another item took its place meanwhile

        // Its camera's shape from the canvas itself: R3F sets it as it
        // measures, but this canvas draws on demand, and a still taken
        // before that came out blank (an aspect of 0: nothing in view).
        const { width, height } = renderer.domElement
        const perspective = camera as PerspectiveCameraImpl
        if (height > 0 && perspective.aspect !== width / height) {
          perspective.aspect = width / height
          perspective.updateProjectionMatrix()
        }

        renderer.render(scene, camera)
        renderer.domElement.toBlob((blob) => {
          if (!blob) return

          const add = () => addThumbnail(key, blob)
          // A tile is waiting: now. The background pre-render: in idle time.
          if (isUrgent) add()
          else whenIdle(add)
        })
      })
  }
  // Stable, so OnReady's effect runs once per item, not per studio render.
  const onReady = useCallback<ReadyHandler>(
    (renderer, scene, camera) => handleReady.current(renderer, scene, camera),
    []
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed opacity-0"
      style={{ left: -10000, top: 0, ...PREVIEW_SIZE }}
    >
      <Canvas
        dpr={[1, 2]}
        // Read back (toBlob) in the same task as the frame is drawn, while the
        // canvas still holds it.
        gl={createPreviewRenderer}
        camera={CAMERA}
        frameloop="never"
        events={noEvents}
        style={{ width: "100%", height: "100%" }}
      >
        {request && (
          <Contents
            key={request.key}
            type={request.type}
            color={request.color}
            spinning={false}
            onReady={onReady}
          />
        )}
      </Canvas>
    </div>
  )
}

interface TileProps {
  type: CatalogItem
  /** Optional colour override, so the preview reflects the picked swatch. */
  color?: string
  /** Keep turning even when not hovered (the armed asset). */
  active?: boolean
}

/**
 * A catalog tile's preview: the item's still (from ThumbnailStudio) — and,
 * while hovered or armed, a live turntable canvas on top of it, framed the
 * same way, so the still turns into the spinning model without a jump (and
 * covers the canvas's start-up). Only those one or two tiles hold a WebGL
 * context; browsers drop the OLDEST past ~16 — which would be the office scene.
 */
export const PreviewTile = ({ type, color, active = false }: TileProps) => {
  const [hovered, setHovered] = useState(false)
  const image = useThumbnail(type, color)
  // While a new colour's still renders, keep showing the previous one.
  const shownImage = useRef(image)
  if (image) shownImage.current = image

  useEffect(() => requestThumbnail(type, color, true), [type, color])
  const isSpinning = hovered || active
  // The live canvas is transparent: once it has drawn the model, the still
  // underneath is hidden (it would show through) — and back when it stops.
  const [isLiveDrawn, setIsLiveDrawn] = useState(false)
  if (!isSpinning && isLiveDrawn) setIsLiveDrawn(false)

  return (
    <div
      className="relative size-full"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {shownImage.current && (
        <img
          src={shownImage.current}
          alt=""
          draggable={false}
          className={clsx("absolute inset-0 size-full", isLiveDrawn && "invisible")}
        />
      )}
      {isSpinning && (
        <Canvas
          dpr={[1, 2]}
          gl={createPreviewRenderer}
          // Camera exists from the first render, so FitCamera frames the right one.
          camera={CAMERA}
          frameloop="demand"
          events={noEvents}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <Contents type={type} color={color} spinning onFirstFrame={() => setIsLiveDrawn(true)} />
        </Canvas>
      )}
    </div>
  )
}
