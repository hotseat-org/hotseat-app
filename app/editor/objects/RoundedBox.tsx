import { forwardRef, type ReactNode } from "react"
import type { ThreeElements } from "@react-three/fiber"
import { ExtrudeGeometry, Shape, type BufferGeometry, type Mesh } from "three"
import { toCreasedNormals } from "three-stdlib"

type Props = Omit<ThreeElements["mesh"], "args" | "ref"> & {
  /** Width, height, depth. */
  args?: [number?, number?, number?]
  radius?: number
  /** Steps round each corner (2–4 here). */
  smoothness?: number
  /** Depth edges are rounded in twice this many steps (default: smoothness). */
  bevelSegments?: number
  steps?: number
  creaseAngle?: number
  children?: ReactNode
}

const EPSILON = 0.00001

/** The box's outline: a rounded rectangle, as drei draws it. */
const createShape = (width: number, height: number, radius0: number) => {
  const shape = new Shape()
  const radius = radius0 - EPSILON
  shape.absarc(EPSILON, EPSILON, EPSILON, -Math.PI / 2, -Math.PI, true)
  shape.absarc(EPSILON, height - radius * 2, EPSILON, Math.PI, Math.PI / 2, true)
  shape.absarc(width - radius * 2, height - radius * 2, EPSILON, Math.PI / 2, 0, true)
  shape.absarc(width - radius * 2, EPSILON, EPSILON, 0, -Math.PI / 2, true)

  return shape
}

/**
 * One geometry per distinct box, shared by every box of that shape. Building a
 * rounded box (an extrusion, then smoothing its normals) is slow, and a big
 * office has thousands of identical ones — desks repeat the same handful of
 * parts. Never disposed: there are only a few hundred shapes in all.
 */
const geometries = new Map<string, BufferGeometry>()
const getRoundedBoxGeometry = (
  width: number,
  height: number,
  depth: number,
  radius: number,
  smoothness: number,
  bevelSegments: number,
  steps: number,
  creaseAngle: number
) => {
  const key = [width, height, depth, radius, smoothness, bevelSegments, steps, creaseAngle].join(
    "|"
  )
  let geometry = geometries.get(key)
  if (!geometry) {
    const extruded = new ExtrudeGeometry(createShape(width, height, radius), {
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSegments: bevelSegments * 2,
      steps,
      bevelSize: radius - EPSILON,
      bevelThickness: radius,
      curveSegments: smoothness,
    })
    extruded.center()
    geometry = toCreasedNormals(extruded, creaseAngle)
    geometries.set(key, geometry)
  }

  return geometry
}

/**
 * drei's RoundedBox, built the same way, with two changes:
 * - its geometry is shared between boxes of the same shape (see above);
 * - its depth edges are rounded in `bevelSegments × 2` steps, twice the corners'
 *   `smoothness`, so long edges catch the light as smooth curves rather than
 *   facets. (Furniture is merged into a few meshes, so triangles there cost
 *   little next to the draw calls merging saves.)
 */
export const RoundedBox = forwardRef<Mesh, Props>(function RoundedBox(
  {
    args: [width = 1, height = 1, depth = 1] = [],
    radius = 0.05,
    smoothness = 4,
    bevelSegments = smoothness,
    steps = 1,
    creaseAngle = 0.4,
    children,
    ...props
  },
  ref
) {
  const geometry = getRoundedBoxGeometry(
    width,
    height,
    depth,
    radius,
    smoothness,
    bevelSegments,
    steps,
    creaseAngle
  )

  return (
    <mesh ref={ref} {...props}>
      {/* Shared: never disposed along with one box. */}
      <primitive object={geometry} attach="geometry" dispose={null} />
      {children}
    </mesh>
  )
})
