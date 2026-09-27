import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  Box3,
  Sphere,
  Vector3,
  type Group,
  type PerspectiveCamera as PerspectiveCameraImpl,
} from "three"
import { ObjectMesh } from "../objects/ObjectMesh"
import { Desk } from "../objects/Desk"
import { Seat } from "../objects/Seat"
import { Model } from "../objects/Model"
import { SEAT } from "../objects/dimensions"
import type { CatalogItem } from "../types"
import { Wall } from "../objects/Wall"

/**
 * Slow turntable so previews read as 3D (Sims-style) — only while `spinning`
 * (hovered / armed). The tile canvases render on demand, so an idle catalog
 * costs nothing per frame.
 */
const Spin = ({ spinning, children }: { spinning: boolean; children: React.ReactNode }) => {
  const ref = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (spinning) invalidate() // kick the demand loop
  }, [spinning, invalidate])
  useFrame((state, dt) => {
    if (!spinning || !ref.current) return
    ref.current.rotation.y += Math.min(dt, 0.05) * 0.55
    state.invalidate()
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Static stand-in for a deskmate: the real component floats a drei <Html> name
 * tag and runs wiggle timers, neither of which belongs in a thumbnail. Mirrors
 * Deskmate's layout with a still animal so the type stays recognisable.
 */
const DeskmatePreview = ({ color }: { color?: string }) => (
  <group>
    <group position={[0, 0, -0.35]}>
      <Desk color={color} />
    </group>
    <group position={[0, 0, 0.4]} rotation={[0, Math.PI, 0]}>
      <Seat />
    </group>
    <group position={[0, SEAT.seatHeight + 0.06, 0.4]} rotation={[0, Math.PI, 0]}>
      <Model url="/models/animal-cat.glb" scale={0.4} />
    </group>
  </group>
)

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
  const ref = useRef<Group>(null)
  const camera = useThree((s) => s.camera) as PerspectiveCameraImpl
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)

  useLayoutEffect(() => {
    if (!ref.current) return
    const sphere = new Box3().setFromObject(ref.current).getBoundingSphere(new Sphere())
    const vFov = (camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / Math.max(1, size.height)))
    const dist = (sphere.radius * MARGIN) / Math.sin(Math.min(vFov, hFov) / 2)
    camera.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist)
    camera.near = Math.max(0.01, dist - sphere.radius * 2)
    camera.far = dist + sphere.radius * 2
    camera.lookAt(sphere.center)
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  return <group ref={ref}>{children}</group>
}

/** Room tool thumbnail: a small square of walls (one segment = 0.5). */
const RoomPreview = ({ color }: { color?: string }) => {
  const segs = [-0.5, 0, 0.5]
  return (
    <group>
      {segs.flatMap((t) => [
        <group key={`n${t}`} position={[t, 0, -0.75]}>
          <Wall color={color} />
        </group>,
        <group key={`s${t}`} position={[t, 0, 0.75]}>
          <Wall color={color} />
        </group>,
        <group key={`w${t}`} position={[-0.75, 0, t]} rotation={[0, Math.PI / 2, 0]}>
          <Wall color={color} />
        </group>,
        <group key={`e${t}`} position={[0.75, 0, t]} rotation={[0, Math.PI / 2, 0]}>
          <Wall color={color} />
        </group>,
      ])}
    </group>
  )
}

const Contents = ({
  type,
  color,
  spinning,
}: {
  type: CatalogItem
  color?: string
  spinning: boolean
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
          ) : type === "deskmate" ? (
            <DeskmatePreview color={color} />
          ) : (
            <ObjectMesh type={type} color={color} />
          )}
        </Spin>
      </FitCamera>
    </Suspense>
  </>
)

interface TileProps {
  type: CatalogItem
  /** Optional colour override, so the preview reflects the picked swatch. */
  color?: string
  /** Keep turning even when not hovered (the armed asset). */
  active?: boolean
}

/**
 * A live, auto-framed 3D preview of a single object type — its own tiny canvas
 * so the object shows exactly as it'll be placed (not an icon). The canvas only
 * mounts while the tile is on screen (scrolled into the catalog's view): each
 * one is a WebGL context, and browsers drop the OLDEST context past ~16 — which
 * would be the main office scene.
 */
export const PreviewTile = ({ type, color, active = false }: TileProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "48px", // mount just before scrolling into view
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="size-full"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {visible && (
        <Canvas
          dpr={[1, 2]}
          gl={{ alpha: true, antialias: true }}
          // Camera exists from the first render, so FitCamera frames the right one.
          camera={{ fov: 32, position: [3.4, 2.6, 3.4] }}
          frameloop="demand"
          style={{ width: "100%", height: "100%" }}
        >
          <Contents type={type} color={color} spinning={hovered || active} />
        </Canvas>
      )}
    </div>
  )
}
