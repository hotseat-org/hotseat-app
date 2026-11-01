import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  abs,
  attribute,
  exp,
  float,
  fract,
  length,
  max,
  mix,
  pow,
  smoothstep,
  uniform,
  uv,
  vec3,
} from "three/tsl"
import { MeshBasicNodeMaterial, type Node } from "three/webgpu"
import { useRoute } from "./wayfinding"

/** Just above the floor and its paint, under the furniture. */
const HEIGHT = 0.02
/** The ribbon's full width (m): a soft halo, with the bright line at its heart. */
const WIDTH = 0.9
/** Light pulses running along the line: one every PERIOD m, at SPEED m/s. */
const PERIOD = 1.6
const SPEED = 1.4
/**
 * How long the pulses run once a way is shown (s). Every frame redraws the
 * whole office, so after that they rest — the glowing line stays.
 */
const FLOW_SECONDS = 8
/** Brighter than white: past the bloom threshold, so the core really glows. */
const HDR = 2.2

/**
 * A flat ribbon along the path (x, z): two vertices per point, offset either
 * side. `distance` runs along it, `across` from −1 to 1 over its width.
 */
const ribbon = (points: [number, number][], width: number) => {
  const count = points.length
  const positions = new Float32Array(count * 2 * 3)
  const distance = new Float32Array(count * 2)
  const across = new Float32Array(count * 2)
  const index: number[] = []
  let run = 0
  for (let i = 0; i < count; i++) {
    const [x, z] = points[i]
    if (i > 0) run += Math.hypot(x - points[i - 1][0], z - points[i - 1][1])

    // The direction here: averaged over the segments either side.
    const [prevX, prevZ] = points[Math.max(0, i - 1)]
    const [nextX, nextZ] = points[Math.min(count - 1, i + 1)]
    const length = Math.hypot(nextX - prevX, nextZ - prevZ) || 1
    const normalX = -(nextZ - prevZ) / length
    const normalZ = (nextX - prevX) / length
    const half = width / 2
    positions.set(
      [
        x + normalX * half,
        HEIGHT,
        z + normalZ * half,
        x - normalX * half,
        HEIGHT,
        z - normalZ * half,
      ],
      i * 6
    )
    distance.set([run, run], i * 2)
    across.set([1, -1], i * 2)
    if (i < count - 1) {
      const vertex = i * 2
      index.push(vertex, vertex + 1, vertex + 2, vertex + 1, vertex + 3, vertex + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute("distance", new THREE.BufferAttribute(distance, 1))
  geometry.setAttribute("across", new THREE.BufferAttribute(across, 1))
  geometry.setIndex(index)

  return { geometry, length: run }
}

/** The route's look, shared by the line and its markers: its colour, and the pulses' clock. */
const createLook = () => ({
  color: uniform(new THREE.Color()),
  time: uniform(0),
  routeLength: uniform(1),
})
type Look = ReturnType<typeof createLook>

/** The accent, brightened past white (HDR) where the light is strongest. */
const getBright = (color: Node<"color">) => mix(color, vec3(1), 0.45).mul(HDR)

/** A glowing, see-through material: no tone mapping, so the core really glows. */
const createGlowMaterial = (
  { color, alpha }: { color: Node<"vec3">; alpha: Node<"float"> },
  side: THREE.Side = THREE.FrontSide
) => {
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side,
  })
  material.colorNode = color
  material.opacityNode = alpha
  material.maskNode = alpha.greaterThanEqual(0.01)

  return material
}

const createLineMaterial = ({ color, time, routeLength }: Look) => {
  const along = attribute<"float">("distance", "float")
  const across = abs(attribute<"float">("across", "float"))
  // A soft halo across the ribbon, and a slim bright core.
  const halo = exp(across.mul(across).mul(-7)).mul(0.42)
  const core = float(1).sub(smoothstep(0.1, 0.2, across))
  // Pulses of light running toward the desk (a short gaussian each).
  const phase = fract(along.sub(time).div(PERIOD)).sub(0.5)
  const pulse = exp(pow(phase.mul(PERIOD / 0.22), 2).negate()).mul(
    float(1).sub(smoothstep(0.15, 0.35, across))
  )
  // Fade in from the door and out at the chair.
  const ends = smoothstep(0, 0.35, along).mul(smoothstep(0, 0.35, routeLength.sub(along)))
  const lit = mix(color, getBright(color), max(core.mul(0.85), pulse))
  const rgb = mix(lit, vec3(HDR * 1.3), pulse.mul(0.6))
  const alpha = max(halo, max(core.mul(0.95), pulse)).mul(mix(0.35, 1, ends))

  return createGlowMaterial({ color: rgb, alpha }, THREE.DoubleSide)
}

/** A glowing marker on the floor: a dot (the entrance) or a ring (the desk). */
const createMarkerMaterial = ({ color }: Look, isRing: boolean) => {
  const fromCentre = length(uv().sub(0.5)).mul(2) // 0 centre … 1 edge
  const shape = isRing
    ? float(1).sub(smoothstep(0.035, 0.07, abs(fromCentre.sub(0.55))))
    : float(1).sub(smoothstep(0.24, 0.3, fromCentre))
  const halo = isRing
    ? exp(pow(fromCentre.sub(0.55).div(0.2), 2).negate()).mul(0.45)
    : exp(fromCentre.mul(fromCentre).mul(-5)).mul(0.5)

  return createGlowMaterial({ color: mix(color, getBright(color), shape), alpha: max(shape, halo) })
}

/** The app's accent (it follows the colour scheme), read from the page. */
const accentColor = () =>
  typeof window === "undefined"
    ? "#4a6fae"
    : getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4a6fae"

/** The way to a desk, drawn on the floor as a glowing line (see wayfinding.ts). View mode only. */
export const RouteLine = () => {
  const route = useRoute()
  // The shown floor's part of it (none when it doesn't pass here).
  const points = route?.path?.points.length ? route.path.points : undefined
  const invalidate = useThree((state) => state.invalidate)
  const [isStill, setIsStill] = useState(false)
  useEffect(() => setIsStill(matchMedia("(prefers-reduced-motion: reduce)").matches), [])

  const strip = useMemo(() => points && ribbon(points, WIDTH), [points])
  useEffect(() => () => strip?.geometry.dispose(), [strip])
  const look = useMemo(createLook, [])
  const line = useMemo(() => createLineMaterial(look), [look])
  const dot = useMemo(() => createMarkerMaterial(look, false), [look])
  const ring = useMemo(() => createMarkerMaterial(look, true), [look])
  useEffect(
    () => () => {
      line.dispose()
      dot.dispose()
      ring.dispose()
    },
    [line, dot, ring]
  )
  const accent = accentColor()
  look.color.value.set(accent)
  if (strip) look.routeLength.value = strip.length

  // Pulses run (and the desk's ring breathes) for a while after a way is shown.
  const ringMesh = useRef<THREE.Mesh>(null)
  const flowing = useRef(0)
  useEffect(() => {
    flowing.current = 0
    invalidate()
  }, [points, invalidate])
  useFrame((_, delta) => {
    if (!points || isStill || flowing.current >= FLOW_SECONDS) return

    flowing.current += delta
    const isDone = flowing.current >= FLOW_SECONDS
    look.time.value += delta * SPEED
    ringMesh.current?.scale.setScalar(isDone ? 1 : 1 + 0.12 * Math.sin(look.time.value * 3.5))
    invalidate()
  })

  if (!points || !strip) return null

  const [startX, startZ] = points[0]
  const [endX, endZ] = points[points.length - 1]

  return (
    <group raycast={() => null}>
      <mesh geometry={strip.geometry} material={line} renderOrder={2} />
      {/* Where you come in, and where you're going. */}
      <mesh
        position={[startX, HEIGHT + 0.002, startZ]}
        rotation-x={-Math.PI / 2}
        material={dot}
        renderOrder={3}
      >
        <planeGeometry args={[1.1, 1.1]} />
      </mesh>
      <mesh
        ref={ringMesh}
        position={[endX, HEIGHT + 0.002, endZ]}
        rotation-x={-Math.PI / 2}
        material={ring}
        renderOrder={3}
      >
        <planeGeometry args={[1.9, 1.9]} />
      </mesh>
    </group>
  )
}
