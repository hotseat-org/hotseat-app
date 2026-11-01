import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
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

const lineMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color() },
      time: { value: 0 },
      routeLength: { value: 1 },
      period: { value: PERIOD },
      hdr: { value: HDR },
    },
    vertexShader: /* glsl */ `
      attribute float distance;
      attribute float across;
      varying float vDistance;
      varying float vAcross;
      void main() {
        vDistance = distance;
        vAcross = across;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float time;
      uniform float routeLength; // (not "length": that's GLSL's built-in)
      uniform float period;
      uniform float hdr;
      varying float vDistance;
      varying float vAcross;
      void main() {
        float a = abs(vAcross);
        // A soft halo across the ribbon, and a slim bright core.
        float halo = exp(-a * a * 7.0) * 0.42;
        float core = 1.0 - smoothstep(0.1, 0.2, a);
        // Pulses of light running toward the desk (a short gaussian each).
        float p = fract((vDistance - time) / period) - 0.5;
        float pulse = exp(-pow(p * period / 0.22, 2.0)) * (1.0 - smoothstep(0.15, 0.35, a));
        // Fade in from the door and out at the chair.
        float ends = smoothstep(0.0, 0.35, vDistance) * smoothstep(0.0, 0.35, routeLength - vDistance);
        vec3 bright = mix(color, vec3(1.0), 0.45) * hdr;
        vec3 rgb = mix(color, bright, max(core * 0.85, pulse));
        rgb = mix(rgb, vec3(hdr * 1.3), pulse * 0.6);
        float alpha = max(halo, max(core * 0.95, pulse)) * mix(0.35, 1.0, ends);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(rgb, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  })

/** A glowing marker on the floor: a dot (the entrance) or a ring (the desk). */
const markerMaterial = (isRing: boolean) =>
  new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color() },
      hdr: { value: HDR },
      isRing: { value: isRing },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      uniform float hdr;
      uniform bool isRing;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0; // 0 centre … 1 edge
        float shape = isRing
          ? 1.0 - smoothstep(0.035, 0.07, abs(r - 0.55))
          : 1.0 - smoothstep(0.24, 0.3, r);
        float halo = isRing
          ? exp(-pow((r - 0.55) / 0.2, 2.0)) * 0.45
          : exp(-r * r * 5.0) * 0.5;
        vec3 bright = mix(color, vec3(1.0), 0.45) * hdr;
        float alpha = max(shape, halo);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(mix(color, bright, shape), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })

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
  const line = useMemo(lineMaterial, [])
  const dot = useMemo(() => markerMaterial(false), [])
  const ring = useMemo(() => markerMaterial(true), [])
  useEffect(
    () => () => {
      line.dispose()
      dot.dispose()
      ring.dispose()
    },
    [line, dot, ring]
  )
  const accent = accentColor()
  for (const material of [line, dot, ring]) material.uniforms.color.value.set(accent)
  if (strip) line.uniforms.routeLength.value = strip.length

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
    line.uniforms.time.value += delta * SPEED
    ringMesh.current?.scale.setScalar(
      isDone ? 1 : 1 + 0.12 * Math.sin(line.uniforms.time.value * 3.5)
    )
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
